"""Turn graph paths into plain-language kinship explanations."""

# How to read a directed relationship when walking from left person to right person.
# Keys are relationship types; values describe the hop as seen from the current person.
FORWARD_PHRASES = {
    'HAS_CHILD': '{a} is a parent of {b}',
    'PARENT_OF': '{a} is a parent of {b}',
    'CHILD_OF': '{a} is a child of {b}',
    'SPOUSE_OF': '{a} is a spouse of {b}',
    'SIBLING_OF': '{a} is a sibling of {b}',
    'FRIEND_OF': '{a} is a friend of {b}',
}

# When the edge is stored in the opposite direction relative to walk order
REVERSE_PHRASES = {
    'HAS_CHILD': '{a} is a child of {b}',
    'PARENT_OF': '{a} is a child of {b}',
    'CHILD_OF': '{a} is a parent of {b}',
    'SPOUSE_OF': '{a} is a spouse of {b}',
    'SIBLING_OF': '{a} is a sibling of {b}',
    'FRIEND_OF': '{a} is a friend of {b}',
}


def explain_hop(from_name, to_name, rel_type, outgoing):
    """Explain one hop. outgoing=True means edge was stored from_name -> to_name."""
    table = FORWARD_PHRASES if outgoing else REVERSE_PHRASES
    template = table.get(rel_type) or '{a} is connected to {b} ({rel})'
    return template.format(a=from_name, b=to_name, rel=rel_type.replace('_', ' ').lower())


def build_path_explanation(steps):
    """
    steps: list of dicts with keys:
      fromName, toName, type, outgoing (bool)
    Returns summary sentence + list of hop sentences.
    """
    if not steps:
        return {
            'summary': 'No connection found.',
            'hops': [],
            'degree': 0,
        }

    hops = [
        explain_hop(s['fromName'], s['toName'], s['type'], s['outgoing'])
        for s in steps
    ]
    start = steps[0]['fromName']
    end = steps[-1]['toName']
    degree = len(steps)

    if degree == 1:
        summary = hops[0] + '.'
    else:
        summary = (
            f'{start} and {end} are connected through {degree} relationship'
            f'{"s" if degree != 1 else ""}: ' + ' → '.join(hops) + '.'
        )

    return {
        'summary': summary,
        'hops': hops,
        'degree': degree,
        'fromName': start,
        'toName': end,
    }
