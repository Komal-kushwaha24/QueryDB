from __future__ import annotations

import logging
import threading
import time
from dataclasses import dataclass
from typing import Any

from dotenv import load_dotenv

logger = logging.getLogger(__name__)
load_dotenv()

from .documents import SchemaDocument, build_schema_documents
from .embeddings import embed_documents, embed_question
from .index import SchemaVectorIndex
from .schema_loader import SchemaLoader


class RetrievalError(RuntimeError):
    pass


@dataclass(frozen=True)
class ForeignKeyEdge:
    source_table: str
    source_column: str
    referenced_table: str
    referenced_column: str

    @property
    def join_condition(self) -> str:
        return f"{self.source_table}.{self.source_column} = {self.referenced_table}.{self.referenced_column}"


def extract_foreign_key_edges(schema_payload: dict[str, Any]) -> list[ForeignKeyEdge]:
    edges: list[ForeignKeyEdge] = []
    seen: set[tuple[str, str, str, str]] = set()
    for table in schema_payload.get("tables", []) or []:
        source_table = table.get("name", "")
        for foreign_key in table.get("foreignKeys", []) or []:
            src_table = foreign_key.get("sourceTable") or source_table
            src_col = foreign_key.get("sourceColumn", "")
            ref_table = foreign_key.get("referencedTable", "")
            ref_col = foreign_key.get("referencedColumn", "")
            if src_table and src_col and ref_table and ref_col:
                key = (src_table, src_col, ref_table, ref_col)
                if key not in seen:
                    seen.add(key)
                    edges.append(ForeignKeyEdge(src_table, src_col, ref_table, ref_col))
    return edges


def build_table_adjacency(
    tables: list[dict[str, Any]], edges: list[ForeignKeyEdge]
) -> dict[str, set[str]]:
    adjacency: dict[str, set[str]] = {
        table["name"]: set() for table in tables if isinstance(table, dict) and "name" in table
    }
    for edge in edges:
        adjacency.setdefault(edge.source_table, set()).add(edge.referenced_table)
        adjacency.setdefault(edge.referenced_table, set()).add(edge.source_table)
    return adjacency


def _is_table_query_relevant(
    table_name: str,
    question: str,
    table_keywords: dict[str, set[str]] | None = None,
) -> bool:
    if not question:
        return False
    q_lower = question.lower()
    if table_keywords and table_name in table_keywords:
        for kw in table_keywords[table_name]:
            if kw and kw in q_lower:
                return True
    name_lower = table_name.lower()
    if name_lower in q_lower:
        return True
    parts = [p for p in name_lower.split("_") if len(p) >= 3]
    for part in parts:
        if part in q_lower:
            return True
        if part.endswith("ies") and (part[:-3] + "y") in q_lower:
            return True
        if part.endswith("s") and part[:-1] in q_lower:
            return True
        if not part.endswith("s") and (part + "s") in q_lower:
            return True
        if part.startswith("place") and "place" in q_lower:
            return True
        if part.startswith("attend") and "attend" in q_lower:
            return True
    return False


def find_bridge_tables(
    direct_table_names: list[str],
    all_table_names: list[str],
    adjacency: dict[str, set[str]],
    max_bridge_tables: int = 2,
    edges: list[ForeignKeyEdge] | None = None,
    question: str = "",
    table_keywords: dict[str, set[str]] | None = None,
) -> list[str]:
    """Finds intermediate bridge tables and missing junction endpoints required to connect retrieved tables.

    Guarantees:
    - Bounded: Adds at most `max_bridge_tables` unique tables.
    - Prioritized: Disconnected-pair bridge resolution first, active junction completion second, query-relevant inward foreign keys third.
    - Deterministic: Candidate ranking by tier / connectivity / degree / alphabetical name.
    - Safe: Strictly operates on a finite set of known tables, preventing cycles or unbounded traversal.
    """
    if not direct_table_names or max_bridge_tables <= 0:
        return []

    direct_set = set(direct_table_names)
    available_candidates = [name for name in all_table_names if name not in direct_set]
    if not available_candidates:
        return []

    selected_bridges: list[str] = []
    active_set = set(direct_table_names)

    # 1. Disconnected-pair bridge resolution (Prioritized first)
    if len(direct_table_names) >= 2:
        disconnected_pairs: set[frozenset[str]] = set()
        for i in range(len(direct_table_names)):
            for j in range(i + 1, len(direct_table_names)):
                u, v = direct_table_names[i], direct_table_names[j]
                if v not in adjacency.get(u, set()):
                    disconnected_pairs.add(frozenset([u, v]))

        unconnected_pairs = set(disconnected_pairs)
        while unconnected_pairs and len(selected_bridges) < max_bridge_tables:
            candidate_scores: list[tuple[int, int, str, set[frozenset[str]]]] = []
            for candidate in available_candidates:
                if candidate in selected_bridges:
                    continue
                cand_neighbors = adjacency.get(candidate, set())
                # Find which remaining unconnected pairs this candidate can bridge
                bridged_pairs = {
                    pair
                    for pair in unconnected_pairs
                    if all(endpoint in cand_neighbors for endpoint in pair)
                }
                if bridged_pairs:
                    candidate_scores.append(
                        (
                            len(bridged_pairs),
                            len(cand_neighbors),
                            candidate,
                            bridged_pairs,
                        )
                    )

            if not candidate_scores:
                break

            # Deterministic ranking:
            # 1. Most unconnected pairs bridged (descending)
            # 2. Total neighbors/degree (descending)
            # 3. Alphabetical name (ascending)
            candidate_scores.sort(key=lambda item: (-item[0], -item[1], item[2]))
            best_candidate = candidate_scores[0]
            selected_bridges.append(best_candidate[2])
            active_set.add(best_candidate[2])
            unconnected_pairs -= best_candidate[3]

    # 2. Bounded relationship expansion (Outward & Inward)
    if edges and len(selected_bridges) < max_bridge_tables:
        outgoing_by_table: dict[str, set[str]] = {}
        for edge in edges:
            outgoing_by_table.setdefault(edge.source_table, set()).add(edge.referenced_table)

        while len(selected_bridges) < max_bridge_tables:
            candidate_endpoints: list[tuple[int, int, int, str]] = []
            seen_candidates: set[str] = set()

            # Type A: Complete missing endpoints of junction tables already in active_set (Tier 2 - Highest priority)
            for table_name in list(active_set):
                referenced_tables = outgoing_by_table.get(table_name, set())
                # An associative/junction table has >= 2 distinct referenced tables
                if len(referenced_tables) < 2:
                    continue

                missing_refs = referenced_tables.difference(active_set)
                if missing_refs:
                    for missing in missing_refs:
                        if (
                            missing in available_candidates
                            and missing not in selected_bridges
                            and missing not in seen_candidates
                        ):
                            seen_candidates.add(missing)
                            # Prefer missing endpoints whose junction table already has at least one partner in context
                            has_present_partner = 1 if any(
                                bool(outgoing_by_table.get(t, set()).intersection(active_set))
                                for t in active_set
                                if len(outgoing_by_table.get(t, set())) >= 2
                                and missing in outgoing_by_table.get(t, set())
                            ) else 0
                            ref_count = sum(
                                1
                                for t in active_set
                                if len(outgoing_by_table.get(t, set())) >= 2
                                and missing in outgoing_by_table.get(t, set())
                            )
                            candidate_endpoints.append(
                                (2, has_present_partner, ref_count, missing)
                            )

            # Type B: Inward query-relevant child/junction tables referencing active_set (Tier 1)
            for cand in available_candidates:
                if cand in selected_bridges or cand in seen_candidates:
                    continue
                cand_targets = outgoing_by_table.get(cand, set())
                active_targets = cand_targets.intersection(active_set)
                if active_targets and _is_table_query_relevant(cand, question, table_keywords):
                    seen_candidates.add(cand)
                    candidate_endpoints.append(
                        (1, 1, len(active_targets), cand)
                    )

            if not candidate_endpoints:
                break

            # Deterministic ranking:
            # 1. Tier (2 for completing active junction, 1 for inward query-relevant table)
            # 2. Partner already present in context (1 before 0)
            # 3. Connection count (descending)
            # 4. Alphabetical name (ascending)
            candidate_endpoints.sort(key=lambda item: (-item[0], -item[1], -item[2], item[3]))
            chosen_endpoint = candidate_endpoints[0][3]
            selected_bridges.append(chosen_endpoint)
            active_set.add(chosen_endpoint)

    return selected_bridges



def extract_active_join_conditions(
    active_table_names: set[str], edges: list[ForeignKeyEdge]
) -> list[str]:
    """Returns deduplicated, sorted join equality conditions where BOTH endpoints are in active_table_names."""
    conditions: set[str] = set()
    for edge in edges:
        if (
            edge.source_table in active_table_names
            and edge.referenced_table in active_table_names
        ):
            conditions.add(edge.join_condition)
    return sorted(list(conditions))


def format_schema_context(
    tables: list[dict[str, Any]],
    join_conditions: list[str],
) -> str:
    """Renders a clean, deterministic schema description block suitable for LLM prompt injection."""
    lines: list[str] = ["### Database Schema Context\n"]
    for table in tables:
        table_name = table.get("table_name", "")
        metadata = table.get("metadata", {})
        columns = metadata.get("columns", [])
        primary_keys = metadata.get("primaryKeyColumns", [])
        is_bridge = table.get("is_bridge", False)

        bridge_suffix = " (Bridge Table)" if is_bridge else ""
        lines.append(f"#### Table: {table_name}{bridge_suffix}")
        if columns:
            lines.append("- Columns:")
            for col in columns:
                col_name = col.get("name", "")
                data_type = col.get("dataType", "")
                qualifiers: list[str] = []
                if col.get("isPrimaryKey"):
                    qualifiers.append("primary key")
                if not col.get("isNullable"):
                    qualifiers.append("not nullable")
                qual_str = f" ({', '.join(qualifiers)})" if qualifiers else ""
                lines.append(f"  - {col_name}: {data_type}{qual_str}")
        else:
            lines.append("- Columns: none")

        if primary_keys:
            lines.append(f"- Primary Key: {', '.join(primary_keys)}")
        else:
            lines.append("- Primary Key: none")
        lines.append("")

    lines.append("### Available Join Conditions")
    if join_conditions:
        for condition in join_conditions:
            lines.append(f"- {condition}")
    else:
        lines.append("- none")

    return "\n".join(lines).strip()


class RetrievalService:
    def __init__(self, loader: SchemaLoader, encoder: Any | None = None) -> None:
        self.loader = loader
        self.encoder = encoder
        self._indexes: dict[tuple[str, str], SchemaVectorIndex] = {}
        self._schemas: dict[tuple[str, str], dict[str, Any]] = {}
        self._documents: dict[tuple[str, str], dict[str, SchemaDocument]] = {}
        self._lock = threading.Lock()

    def refresh(self, user_id: str = "anonymous", dataset_id: str = "default") -> int:
        scope = self._scope(user_id, dataset_id)
        started = time.monotonic()
        schema_payload = self.loader.load()
        if not schema_payload.get("tables"):
            raise RetrievalError("schema contains no tables to index")

        documents = build_schema_documents(schema_payload)
        if not documents:
            raise RetrievalError("failed to generate schema documents")

        logger.info("Building RAG index for %d tables", len(documents))
        try:
            embeddings = embed_documents(documents, encoder=self.encoder)
            index = SchemaVectorIndex()
            index.refresh(documents, embeddings)
        except Exception as exc:
            if isinstance(exc, RetrievalError):
                raise
            logger.exception("Failed to build schema RAG index")
            raise RetrievalError(f"failed to build schema RAG index: {exc}") from exc

        # Atomic index swap: previous working index is preserved if any earlier step failed
        with self._lock:
            self._indexes[scope] = index
            self._schemas[scope] = schema_payload
            self._documents[scope] = {doc.table_name: doc for doc in documents}

        logger.info(
            "Schema RAG refresh complete: %d tables in %.2fs",
            index.size,
            time.monotonic() - started,
        )
        return index.size

    def retrieve(
        self,
        question: str,
        top_k: int = 3,
        user_id: str = "anonymous",
        dataset_id: str = "default",
    ) -> list[dict[str, Any]]:
        """Preserves existing semantic retrieval API contract."""
        self._validate_query_params(question, top_k)
        scope = self._scope(user_id, dataset_id)
        with self._lock:
            index = self._indexes.get(scope)
        if index is None:
            raise RetrievalError("schema index has not been refreshed for this user and dataset")

        question_embedding = embed_question(question.strip(), encoder=self.encoder)
        matches = index.search(question_embedding, top_k)
        return [
            {
                "table_name": document.table_name,
                "description": document.description,
                "relationships": list(document.relationships),
                "metadata": document.metadata,
                "score": score,
            }
            for document, score in matches
        ]

    def retrieve_context(
        self,
        question: str,
        top_k: int = 3,
        max_bridge_tables: int = 2,
        user_id: str = "anonymous",
        dataset_id: str = "default",
    ) -> dict[str, Any]:
        """Performs semantic retrieval, executes bounded foreign-key bridge expansion,
        extracts active join conditions, and formats a clean schema context string."""
        self._validate_query_params(question, top_k)
        if isinstance(max_bridge_tables, bool) or not isinstance(max_bridge_tables, int) or max_bridge_tables < 0:
            raise ValueError("max_bridge_tables must be a non-negative integer")

        scope = self._scope(user_id, dataset_id)
        with self._lock:
            index = self._indexes.get(scope)
            schema_payload = self._schemas.get(scope)
            doc_map = self._documents.get(scope)

        if index is None or schema_payload is None or doc_map is None:
            raise RetrievalError("schema index has not been refreshed for this user and dataset")

        question_embedding = embed_question(question.strip(), encoder=self.encoder)
        direct_matches = index.search(question_embedding, top_k)

        direct_table_names = [document.table_name for document, _ in direct_matches]
        all_tables = [table["name"] for table in schema_payload.get("tables", []) or []]
        edges = extract_foreign_key_edges(schema_payload)
        adjacency = build_table_adjacency(schema_payload.get("tables", []), edges)

        table_keywords: dict[str, set[str]] = {}
        for table in schema_payload.get("tables", []) or []:
            t_name = table.get("name", "")
            kws = {t_name.lower()}
            for col in table.get("columns", []) or []:
                c_name = col.get("name", "").lower()
                if c_name not in ("id", "created_at", "updated_at", "status") and not c_name.endswith("_id"):
                    kws.add(c_name)
            table_keywords[t_name] = kws

        # Bounded bridge-table expansion
        bridge_names = find_bridge_tables(
            direct_table_names,
            all_tables,
            adjacency,
            max_bridge_tables=max_bridge_tables,
            edges=edges,
            question=question,
            table_keywords=table_keywords,
        )

        final_tables: list[dict[str, Any]] = []

        # 1. Directly retrieved tables
        for document, score in direct_matches:
            final_tables.append(
                {
                    "table_name": document.table_name,
                    "description": document.description,
                    "relationships": list(document.relationships),
                    "metadata": document.metadata,
                    "score": score,
                    "is_bridge": False,
                    "provenance": "semantic",
                }
            )

        # 2. Relationship-expanded bridge tables
        for bridge_name in bridge_names:
            bridge_doc = doc_map.get(bridge_name)
            if bridge_doc:
                final_tables.append(
                    {
                        "table_name": bridge_doc.table_name,
                        "description": bridge_doc.description,
                        "relationships": list(bridge_doc.relationships),
                        "metadata": bridge_doc.metadata,
                        "score": None,  # Do not fabricate a semantic similarity score
                        "is_bridge": True,
                        "provenance": "relationship_expansion",
                    }
                )

        active_table_names = {table["table_name"] for table in final_tables}
        join_conditions = extract_active_join_conditions(active_table_names, edges)
        allowed_tables = sorted(list(active_table_names))
        prompt_context = format_schema_context(final_tables, join_conditions)

        return {
            "tables": final_tables,
            "join_conditions": join_conditions,
            "allowed_tables": allowed_tables,
            "prompt_context": prompt_context,
        }

    @staticmethod
    def _validate_query_params(question: str, top_k: int) -> None:
        if not isinstance(question, str) or not question.strip():
            raise ValueError("question must be a non-empty string")
        if len(question.strip()) > 10_000:
            raise ValueError("question is too long")
        if isinstance(top_k, bool) or not isinstance(top_k, int) or top_k <= 0:
            raise ValueError("top_k must be a positive integer")

    @staticmethod
    def _scope(user_id: str, dataset_id: str) -> tuple[str, str]:
        if not isinstance(user_id, str) or not user_id.strip():
            raise ValueError("user_id must be a non-empty string")
        if not isinstance(dataset_id, str) or not dataset_id.strip():
            raise ValueError("dataset_id must be a non-empty string")
        return user_id.strip(), dataset_id.strip()


_default_service = RetrievalService(SchemaLoader())


def refresh_schema(user_id: str = "anonymous", dataset_id: str = "default") -> int:
    return _default_service.refresh(user_id=user_id, dataset_id=dataset_id)


def retrieve_schema(
    question: str,
    top_k: int = 3,
    user_id: str = "anonymous",
    dataset_id: str = "default",
) -> list[dict[str, Any]]:
    return _default_service.retrieve(
        question, top_k=top_k, user_id=user_id, dataset_id=dataset_id
    )


def retrieve_schema_context(
    question: str,
    top_k: int = 3,
    max_bridge_tables: int = 2,
    user_id: str = "anonymous",
    dataset_id: str = "default",
) -> dict[str, Any]:
    return _default_service.retrieve_context(
        question,
        top_k=top_k,
        max_bridge_tables=max_bridge_tables,
        user_id=user_id,
        dataset_id=dataset_id,
    )
