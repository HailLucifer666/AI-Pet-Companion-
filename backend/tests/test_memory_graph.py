"""graph_edges: threshold filter + per-node top-K + dedup for the Memory Web."""

from ai_pet_companion.memory.store import graph_edges


def test_drops_pairs_below_threshold():
    pairs = [(1, 2, 0.9), (1, 3, 0.2), (2, 3, 0.5)]
    edges = graph_edges(pairs, threshold=0.45, top_k=5)
    keys = {(a, b) for a, b, _ in edges}
    assert (1, 2) in keys
    assert (2, 3) in keys
    assert (1, 3) not in keys  # 0.2 < 0.45


def test_top_k_is_a_union_no_node_orphaned():
    # Union top-K: an edge survives iff at least one endpoint ranks it in its top-K,
    # so every node keeps its strongest link (no orphans).
    pairs = [(1, 2, 0.9), (1, 3, 0.5), (2, 3, 0.8)]
    edges = graph_edges(pairs, threshold=0.45, top_k=1)
    keys = {(a, b) for a, b, _ in edges}
    assert (1, 2) in keys  # node 1's and node 2's strongest
    assert (2, 3) in keys  # node 3's strongest
    assert (1, 3) not in keys  # neither endpoint ranks it #1 â†’ pruned


def test_dedups_and_orders_and_carries_similarity():
    pairs = [(2, 1, 0.7)]  # given out of order
    edges = graph_edges(pairs, threshold=0.45, top_k=5)
    assert edges == [(1, 2, 0.7)]  # normalized to a<b, sim preserved


def test_empty_when_nothing_passes():
    assert graph_edges([(1, 2, 0.1)], threshold=0.45, top_k=5) == []
    assert graph_edges([], threshold=0.45, top_k=5) == []
