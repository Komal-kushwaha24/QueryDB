from __future__ import annotations

from copy import deepcopy
from dataclasses import dataclass
from typing import Any


@dataclass(frozen=True)
class SchemaDocument:
    table_name: str
    description: str
    relationships: tuple[str, ...]
    metadata: dict[str, Any]

    @property
    def text(self) -> str:
        return self.description


def build_schema_documents(schema_payload: dict[str, Any]) -> list[SchemaDocument]:
    schema_name = schema_payload["schema"]
    documents: list[SchemaDocument] = []
    tables = schema_payload.get("tables", [])

    # Pass 1: Collect incoming foreign-key references for each table
    incoming_by_table: dict[str, list[str]] = {table["name"]: [] for table in tables}
    for table in tables:
        source_table = table["name"]
        for foreign_key in table.get("foreignKeys", []) or []:
            ref_table = foreign_key.get("referencedTable")
            source_col = foreign_key.get("sourceColumn")
            ref_col = foreign_key.get("referencedColumn")
            if ref_table and source_col and ref_col:
                rel = f"{source_table}.{source_col} references {ref_table}.{ref_col}"
                if ref_table in incoming_by_table:
                    incoming_by_table[ref_table].append(rel)
                else:
                    incoming_by_table[ref_table] = [rel]

    # Pass 2: Build SchemaDocument for each table
    for table in tables:
        table_metadata = deepcopy(table)
        table_metadata["schema"] = schema_name
        table_name = table["name"]
        column_descriptions = []
        for column in table.get("columns", []) or []:
            qualifiers = []
            if column.get("isPrimaryKey"):
                qualifiers.append("primary key")
            if not column.get("isNullable"):
                qualifiers.append("not nullable")
            suffix = f" ({', '.join(qualifiers)})" if qualifiers else ""
            column_descriptions.append(f"{column['name']}: {column['dataType']}{suffix}")

        primary_keys = table.get("primaryKeyColumns", [])
        relationships = [
            (
                f"{foreign_key['sourceTable']}.{foreign_key['sourceColumn']} references "
                f"{foreign_key['referencedTable']}.{foreign_key['referencedColumn']}"
            )
            for foreign_key in table.get("foreignKeys", []) or []
        ]

        lines = [
            f"Schema: {schema_name}",
            f"Table: {table_name}",
            "Columns: " + (", ".join(column_descriptions) if column_descriptions else "none"),
            "Primary keys: " + (", ".join(primary_keys) if primary_keys else "none"),
        ]
        if relationships:
            lines.append("Foreign-key relationships: " + "; ".join(relationships))
        else:
            lines.append("Foreign-key relationships: none")

        incoming_relationships = incoming_by_table.get(table_name, [])
        if incoming_relationships:
            lines.append("Incoming foreign-key relationships: " + "; ".join(incoming_relationships))
        else:
            lines.append("Incoming foreign-key relationships: none")

        documents.append(
            SchemaDocument(
                table_name=table_name,
                description="\n".join(lines),
                relationships=tuple(relationships),
                metadata=table_metadata,
            )
        )
    return documents

