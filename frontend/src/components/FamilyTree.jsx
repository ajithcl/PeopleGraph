import { useEffect, useRef } from 'react'
import * as d3 from 'd3'
import { apiBase } from '../api'
import { getRelColor } from '../utils/relColors'

const MAX_PER_RING = 28

function getInitials(name) {
  return (name || '?')
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 3)
}

function getInitialsSVG(name, gender) {
  const initials = getInitials(name)
  const bgColor = gender === 'male' ? '#dbeafe' : '#fce7f3'
  const textColor = gender === 'male' ? '#3b82f6' : '#ec4899'
  const svgStr = `<svg xmlns="http://www.w3.org/2000/svg" width="70" height="70">
    <rect width="70" height="70" fill="${bgColor}"/>
    <text x="35" y="42" text-anchor="middle" font-size="26" font-weight="700" fill="${textColor}">${initials}</text>
  </svg>`
  return `data:image/svg+xml;base64,${btoa(svgStr)}`
}

function photoHref(person) {
  if (!person.photoUrl) return getInitialsSVG(person.name, person.gender)
  let url = person.photoUrl
  if (url.startsWith('/uploads/')) url = `${apiBase()}${url}`
  return url
}

function buildAdjacency(relationships) {
  const adj = new Map()
  relationships.forEach((rel) => {
    if (!adj.has(rel.from)) adj.set(rel.from, [])
    if (!adj.has(rel.to)) adj.set(rel.to, [])
    adj.get(rel.from).push({ id: rel.to, rel })
    adj.get(rel.to).push({ id: rel.from, rel })
  })
  return adj
}

function layoutGenerations(rootId, nodesById, relationships, maxGen, extraIds) {
  const adj = buildAdjacency(relationships)
  const visited = new Set([rootId])
  const layers = [[rootId]]
  const parentRel = new Map()

  for (let gen = 1; gen <= maxGen; gen += 1) {
    const next = []
    for (const id of layers[gen - 1]) {
      for (const neighbor of adj.get(id) || []) {
        if (visited.has(neighbor.id) || !nodesById.has(neighbor.id)) continue
        visited.add(neighbor.id)
        parentRel.set(neighbor.id, neighbor.rel)
        next.push(neighbor.id)
        if (next.length >= MAX_PER_RING) break
      }
      if (next.length >= MAX_PER_RING) break
    }
    layers.push(next)
    if (!next.length) break
  }

  const extras = (extraIds || []).filter((id) => id && !visited.has(id) && nodesById.has(id))
  if (extras.length) {
    extras.forEach((id) => visited.add(id))
    layers.push(extras.slice(0, MAX_PER_RING))
  }

  return { layers, parentRel, visited }
}

export default function FamilyTree({ data, onNodeClick, highlightPath, rootPersonId, generations = 2 }) {
  const svgRef = useRef()
  const zoomRef = useRef(null)

  useEffect(() => {
    if (!data || !data.nodes.length) return undefined

    const width = 1200
    const height = 860
    const cx = width / 2
    const cy = height / 2
    const rootRadius = 48
    const nodeRadius = 30
    const ringGap = 210

    d3.select(svgRef.current).selectAll('*').remove()

    const svg = d3
      .select(svgRef.current)
      .attr('width', '100%')
      .attr('height', height)
      .attr('viewBox', `0 0 ${width} ${height}`)
      .style('touch-action', 'none')
      .style('cursor', 'grab')
      .style('user-select', 'none')

    const defs = svg.append('defs')
    const viewport = svg.append('g').attr('class', 'tree-viewport')

    const glowFilter = defs
      .append('filter')
      .attr('id', 'root-glow')
      .attr('x', '-50%')
      .attr('y', '-50%')
      .attr('width', '200%')
      .attr('height', '200%')
    glowFilter.append('feGaussianBlur').attr('stdDeviation', '6').attr('result', 'coloredBlur')
    const feMerge = glowFilter.append('feMerge')
    feMerge.append('feMergeNode').attr('in', 'coloredBlur')
    feMerge.append('feMergeNode').attr('in', 'SourceGraphic')

    const shadowFilter = defs
      .append('filter')
      .attr('id', 'node-shadow')
      .attr('x', '-30%')
      .attr('y', '-30%')
      .attr('width', '160%')
      .attr('height', '160%')
    shadowFilter
      .append('feDropShadow')
      .attr('dx', 0)
      .attr('dy', 3)
      .attr('stdDeviation', 5)
      .attr('flood-color', 'rgba(0,0,0,0.12)')

    const nodesById = new Map(data.nodes.map((n) => [n.id, n]))
    const rootNode =
      (rootPersonId && nodesById.get(rootPersonId)) ||
      data.nodes.find((n) => n.id === '0') ||
      data.nodes[0]

    const maxGen = Math.max(1, Math.min(4, Number(generations) || 2))
    const { layers, parentRel } = layoutGenerations(
      rootNode.id,
      nodesById,
      data.relationships,
      maxGen,
      highlightPath || [],
    )

    const positions = new Map()
    positions.set(rootNode.id, { x: cx, y: cy, gen: 0, node: rootNode })

    layers.forEach((ids, gen) => {
      if (gen === 0) return
      const radius = ringGap * gen
      viewport
        .append('circle')
        .attr('cx', cx)
        .attr('cy', cy)
        .attr('r', radius)
        .attr('fill', 'none')
        .attr('stroke', '#e2e8f0')
        .attr('stroke-width', 1.5)
        .attr('stroke-dasharray', '6,5')
        .attr('opacity', 0.7)

      ids.forEach((id, i) => {
        const node = nodesById.get(id)
        if (!node) return
        const angle = (2 * Math.PI * i) / Math.max(ids.length, 1) - Math.PI / 2
        positions.set(id, {
          x: cx + radius * Math.cos(angle),
          y: cy + radius * Math.sin(angle),
          gen,
          node,
          rel: parentRel.get(id),
        })
      })
    })

    const visibleIds = new Set(positions.keys())
    const visibleRels = data.relationships.filter((r) => visibleIds.has(r.from) && visibleIds.has(r.to))
    const pathSet = new Set(highlightPath || [])
    const pathPairs = new Set()
    if (highlightPath && highlightPath.length > 1) {
      for (let i = 0; i < highlightPath.length - 1; i += 1) {
        pathPairs.add(`${highlightPath[i]}|${highlightPath[i + 1]}`)
        pathPairs.add(`${highlightPath[i + 1]}|${highlightPath[i]}`)
      }
    }

    const isPathEdge = (rel) => pathPairs.has(`${rel.from}|${rel.to}`)

    defs.append('clipPath').attr('id', 'clip-root').append('circle').attr('r', rootRadius - 2)
    positions.forEach((pos, id) => {
      if (id === rootNode.id) return
      defs.append('clipPath').attr('id', `clip-node-${id}`).append('circle').attr('r', nodeRadius - 2)
    })

    const edgeGroup = viewport.append('g').attr('class', 'edges')
    visibleRels.forEach((rel) => {
      const a = positions.get(rel.from)
      const b = positions.get(rel.to)
      if (!a || !b) return
      const highlighted = isPathEdge(rel)
      edgeGroup
        .append('line')
        .attr('x1', a.x)
        .attr('y1', a.y)
        .attr('x2', b.x)
        .attr('y2', b.y)
        .attr('stroke', highlighted ? '#fbbf24' : getRelColor(rel.type).stroke)
        .attr('stroke-width', highlighted ? 3.5 : 1.6)
        .attr('stroke-linecap', 'round')
        .attr('opacity', highlighted ? 0.95 : 0.55)
    })

    const labelGroup = viewport.append('g').attr('class', 'spoke-labels')
    positions.forEach((pos) => {
      if (pos.gen !== 1 || !pos.rel) return
      const midX = cx + (pos.x - cx) * 0.52
      const midY = cy + (pos.y - cy) * 0.52
      const col = getRelColor(pos.rel.type)
      labelGroup
        .append('rect')
        .attr('x', midX - 36)
        .attr('y', midY - 10)
        .attr('width', 72)
        .attr('height', 20)
        .attr('rx', 10)
        .attr('fill', col.bg)
        .attr('stroke', col.stroke)
        .attr('stroke-width', 1)
        .style('pointer-events', 'none')
      labelGroup
        .append('text')
        .attr('x', midX)
        .attr('y', midY + 4)
        .attr('text-anchor', 'middle')
        .attr('font-size', '9px')
        .attr('font-weight', '600')
        .attr('fill', col.label)
        .text(pos.rel.type.replace(/_/g, ' '))
        .style('pointer-events', 'none')
    })

    const nodeGroup = viewport.append('g').attr('class', 'nodes')
    positions.forEach((pos, id) => {
      if (id === rootNode.id) return
      const highlighted = pathSet.has(id)
      const g = nodeGroup
        .append('g')
        .attr('transform', `translate(${pos.x},${pos.y})`)
        .style('cursor', 'pointer')
        .on('click', (event) => {
          if (event.defaultPrevented) return
          onNodeClick(pos.node)
        })

      g.append('circle')
        .attr('r', nodeRadius)
        .attr('fill', pos.node.gender === 'male' ? '#dbeafe' : '#fce7f3')
        .attr('stroke', highlighted ? '#fbbf24' : pos.rel ? getRelColor(pos.rel.type).stroke : '#94a3b8')
        .attr('stroke-width', highlighted ? 4 : 2.5)
        .attr('filter', 'url(#node-shadow)')

      g.append('image')
        .attr('x', -nodeRadius)
        .attr('y', -nodeRadius)
        .attr('width', nodeRadius * 2)
        .attr('height', nodeRadius * 2)
        .attr('clip-path', `url(#clip-node-${id})`)
        .attr('href', photoHref(pos.node))
        .attr('preserveAspectRatio', 'xMidYMid slice')

      g.append('text')
        .attr('dy', nodeRadius + 14)
        .attr('text-anchor', 'middle')
        .attr('font-size', '10px')
        .attr('font-weight', '700')
        .attr('fill', '#1e293b')
        .text(pos.node.name)

      g.append('text')
        .attr('dy', nodeRadius + 26)
        .attr('text-anchor', 'middle')
        .attr('font-size', '9px')
        .attr('fill', '#94a3b8')
        .text(pos.node.dateOfBirth ? new Date(pos.node.dateOfBirth).getFullYear() : '')
    })

    const rootGroup = viewport
      .append('g')
      .attr('class', 'root-node')
      .attr('transform', `translate(${cx},${cy})`)
      .style('cursor', 'pointer')
      .on('click', (event) => {
        if (event.defaultPrevented) return
        onNodeClick(rootNode)
      })

    rootGroup
      .append('circle')
      .attr('r', rootRadius + 10)
      .attr('fill', 'none')
      .attr('stroke', pathSet.has(rootNode.id) ? '#fbbf24' : '#6366f1')
      .attr('stroke-width', 2)
      .attr('opacity', 0.25)
      .attr('filter', 'url(#root-glow)')

    rootGroup
      .append('circle')
      .attr('r', rootRadius)
      .attr('fill', rootNode.gender === 'male' ? '#dbeafe' : '#fce7f3')
      .attr('stroke', pathSet.has(rootNode.id) ? '#fbbf24' : '#6366f1')
      .attr('stroke-width', 4)
      .attr('filter', 'url(#root-glow)')

    rootGroup
      .append('image')
      .attr('x', -rootRadius)
      .attr('y', -rootRadius)
      .attr('width', rootRadius * 2)
      .attr('height', rootRadius * 2)
      .attr('clip-path', 'url(#clip-root)')
      .attr('href', photoHref(rootNode))
      .attr('preserveAspectRatio', 'xMidYMid slice')

    rootGroup
      .append('text')
      .attr('dy', rootRadius + 18)
      .attr('text-anchor', 'middle')
      .attr('font-size', '13px')
      .attr('font-weight', '800')
      .attr('fill', '#1e293b')
      .text(rootNode.name)

    rootGroup
      .append('text')
      .attr('dy', rootRadius + 33)
      .attr('text-anchor', 'middle')
      .attr('font-size', '10px')
      .attr('fill', '#6366f1')
      .attr('font-weight', '600')
      .text(rootNode.dateOfBirth ? new Date(rootNode.dateOfBirth).getFullYear() : '')

    const usedTypes = [...new Set(visibleRels.map((r) => r.type))]
    const legend = svg.append('g').attr('class', 'tree-legend').attr('transform', 'translate(20, 20)')
    usedTypes.forEach((type, i) => {
      const col = getRelColor(type)
      const row = legend.append('g').attr('transform', `translate(0, ${i * 22})`)
      row
        .append('rect')
        .attr('width', 14)
        .attr('height', 14)
        .attr('rx', 4)
        .attr('fill', col.bg)
        .attr('stroke', col.stroke)
        .attr('stroke-width', 1.5)
      row
        .append('text')
        .attr('x', 20)
        .attr('y', 11)
        .attr('font-size', '11px')
        .attr('font-weight', '600')
        .attr('fill', col.label)
        .text(type.replace(/_/g, ' '))
    })

    const zoom = d3
      .zoom()
      .scaleExtent([0.3, 4])
      .filter((event) => {
        if (event.type.startsWith('touch')) return true
        if (event.type === 'wheel') return true
        return !event.ctrlKey && event.button === 0
      })
      .on('start', (event) => {
        if (event.sourceEvent && event.sourceEvent.type !== 'wheel') {
          svg.style('cursor', 'grabbing')
        }
      })
      .on('zoom', (event) => {
        viewport.attr('transform', event.transform)
      })
      .on('end', () => {
        svg.style('cursor', 'grab')
      })

    svg.call(zoom)
    svg.on('dblclick.zoom', null)
    zoomRef.current = { selection: svg, zoom }

    return () => {
      svg.on('.zoom', null)
      zoomRef.current = null
    }
  }, [data, highlightPath, rootPersonId, onNodeClick, generations])

  const resetView = () => {
    const handle = zoomRef.current
    if (!handle) return
    handle.selection.transition().duration(250).call(handle.zoom.transform, d3.zoomIdentity)
  }

  return (
    <div className="relative bg-white rounded-2xl shadow-xl border border-slate-100 p-3 sm:p-4 overflow-hidden select-none" style={{ minHeight: '420px' }}>
      <div className="absolute top-4 right-4 z-10 flex items-center gap-2">
        <p className="hidden sm:block text-xs text-slate-400 mr-1">Drag to pan · pinch or scroll to zoom</p>
        <button
          type="button"
          onClick={resetView}
          className="bg-white border border-slate-200 text-slate-700 text-sm font-semibold px-3 py-2 rounded-xl shadow-sm hover:bg-slate-50"
        >
          Reset view
        </button>
      </div>
      <p className="sm:hidden text-xs text-slate-400 mb-2">Pinch to zoom · drag to pan</p>
      <svg ref={svgRef} className="touch-none block w-full max-w-full" />
    </div>
  )
}
