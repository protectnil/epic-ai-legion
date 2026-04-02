#!/usr/bin/env python3
import json, os
from pathlib import Path

BASE = Path("/home/nilassist/projects/epic-ai-core")
QDRANT_URL = "http://localhost:6333"
COLLECTION = "legion_tools"
BATCH_SIZE = 100

from qdrant_client import QdrantClient
from qdrant_client.models import VectorParams, SparseVectorParams, Distance, PointStruct, SparseVector
from fastembed import SparseTextEmbedding
from openai import OpenAI

openai_client = OpenAI(api_key=os.environ["OPENAI_API_KEY"])
qdrant = QdrantClient(url=QDRANT_URL)

print("Loading SPLADE model...")
splade = SparseTextEmbedding(model_name="prithivida/Splade_PP_en_v1")
print("Loading BM25 model...")
bm25 = SparseTextEmbedding(model_name="Qdrant/bm25")
print("Models loaded.")

print("Creating collection...")
qdrant.recreate_collection(
    collection_name=COLLECTION,
    vectors_config={"dense": VectorParams(size=1536, distance=Distance.COSINE)},
    sparse_vectors_config={
        "splade": SparseVectorParams(modifier="idf"),
        "bm25": SparseVectorParams(modifier="idf"),
    },
    on_disk_payload=True,
)
print("Collection created.")

with open(BASE / "adapter-catalog.json") as f:
    catalog = json.load(f)
with open(BASE / "mcp-registry.json") as f:
    registry = json.load(f)

docs = []
for e in catalog:
    tools = e.get("toolNames", [])
    text = ". ".join(filter(None, [
        e.get("displayName", e.get("name", "")),
        e.get("description", ""),
        e.get("category", ""),
        " ".join(t.replace("_", " ") for t in tools),
        " ".join(e.get("keywords", [])),
    ]))
    docs.append({"text": text, "payload": {
        "adapter_id": e["name"], "name": e.get("displayName", e["name"]),
        "category": e.get("category", "misc"), "toolCount": len(tools),
        "toolNames": tools, "type": "rest",
    }})

for e in registry:
    if e.get("type") != "mcp":
        continue
    mcp = e.get("mcp", {})
    tools = mcp.get("toolNames", [])
    text = ". ".join(filter(None, [
        e.get("name", ""), e.get("description", ""),
        e.get("category", ""),
        " ".join(t.replace("_", " ") for t in tools),
    ]))
    docs.append({"text": text, "payload": {
        "adapter_id": e["id"], "name": e.get("name", e["id"]),
        "category": e.get("category", "misc"),
        "toolCount": mcp.get("toolCount", len(tools)),
        "toolNames": tools[:50], "type": "mcp",
        "transport": mcp.get("transport", "unknown"),
    }})

print(f"Documents to embed: {len(docs)}")

embedded = 0
for i in range(0, len(docs), BATCH_SIZE):
    batch = docs[i:i + BATCH_SIZE]
    texts = [d["text"][:8000] for d in batch]

    dense_vecs = [e.embedding for e in openai_client.embeddings.create(
        model="text-embedding-3-small", input=texts
    ).data]

    splade_vecs = list(splade.embed(texts))
    bm25_vecs = list(bm25.embed(texts))

    points = []
    for j, doc in enumerate(batch):
        points.append(PointStruct(
            id=embedded + j + 1,
            vector={
                "dense": dense_vecs[j],
                "splade": SparseVector(
                    indices=splade_vecs[j].indices.tolist(),
                    values=splade_vecs[j].values.tolist(),
                ),
                "bm25": SparseVector(
                    indices=bm25_vecs[j].indices.tolist(),
                    values=bm25_vecs[j].values.tolist(),
                ),
            },
            payload=doc["payload"],
        ))

    qdrant.upsert(collection_name=COLLECTION, points=points)
    embedded += len(batch)
    print(f"\r  {embedded}/{len(docs)} embedded", end="", flush=True)

print(f"\nDone. {embedded} documents embedded.")
info = qdrant.get_collection(COLLECTION)
print(f"Qdrant points: {info.points_count}")
