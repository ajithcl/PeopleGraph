import { useEffect, useRef } from 'react'
import * as d3 from 'd3'
import { apiBase } from '../api'
import { getRelColor } from '../utils/relColors'

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

export default function FamilyTree({ data, onNodeClick, highlightPath, rootPersonId }) {
  const svgRef = useRef()

  useEffect(() => {
    if (!data || !data.nodes.length) return

    const width = 1200
    const height = 860
    const cx = width / 2
    const cy = height / 2
    const rootRadius = 48
    const nodeRadius = 34
    const spokeLength = 320

    d3.select(svgRef.current).selectAll('*').remove()

    const svg = d3
      .select(svgRef.current)
      .attr('width', '100%')
      .attr('height', height)
      .attr('viewBox', `0 0 ${width} ${height}`)

    const defs = svg.append('defs')

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

    const rootNode =
      (rootPersonId && data.nodes.find((n) => n.id === rootPersonId)) ||
      data.nodes.find((n) => n.id === '0') ||
      data.nodes[0]

    const connectedRels = data.relationships
      .filter((r) => r.from === rootNode.id || r.to === rootNode.id)
      .slice(0, 24)

    const connectedNodes = connectedRels
      .map((r) => {
        const peerId = r.from === rootNode.id ? r.to : r.from
        const peer = data.nodes.find((n) => n.id === peerId)
        return { node: peer, rel: r }
      })
      .filter((d) => d.node)

    const total = connectedNodes.length
    const spokeData = connectedNodes.map((d, i) => {
      const angle = (2 * Math.PI * i) / Math.max(total, 1) - Math.PI / 2
      return {
        ...d,
        angle,
        x: cx + spokeLength * Math.cos(angle),
        y: cy + spokeLength * Math.sin(angle),
      }
    })

    svg
      .append('circle')
      .attr('cx', cx)
      .attr('cy', cy)
      .attr('r', spokeLength)
      .attr('fill', 'none')
      .attr('stroke', '#e2e8f0')
      .attr('stroke-width', 1.5)
      .attr('stroke-dasharray', '6,5')
      .attr('opacity', 0.7)

    defs.append('clipPath').attr('id', 'clip-root').append('circle').attr('r', rootRadius - 2)

    spokeData.forEach((d) => {
      defs
        .append('clipPath')
        .attr('id', `clip-spoke-${d.node.id}`)
        .append('circle')
        .attr('r', nodeRadius - 2)
    })

    const spokeGroup = svg.append('g').attr('class', 'spokes')
    const lines = spokeGroup
      .selectAll('.spoke-line')
      .data(spokeData)
      .enter()
      .append('line')
      .attr('class', 'spoke-line')
      .attr('x1', cx)
      .attr('y1', cy)
      .attr('x2', cx)
      .attr('y2', cy)
      .attr('stroke', (d) => {
        const isHighlighted = highlightPath && highlightPath.includes(d.node.id)
        return isHighlighted ? '#fbbf24' : getRelColor(d.rel.type).stroke
      })
      .attr('stroke-width', (d) => (highlightPath && highlightPath.includes(d.node.id) ? 3.5 : 2))
      .attr('stroke-linecap', 'round')
      .attr('opacity', 0.75)

    lines
      .transition()
      .duration(700)
      .delay((d, i) => i * 60)
      .ease(d3.easeCubicOut)
      .attr('x2', (d) => d.x)
      .attr('y2', (d) => d.y)

    const labelGroup = svg.append('g').attr('class', 'spoke-labels')
    const labelData = spokeData.map((d) => {
      const midX = cx + (d.x - cx) * 0.52
      const midY = cy + (d.y - cy) * 0.52
      const relType = d.rel.type.replace(/_/g, ' ')
      return { ...d, midX, midY, relType }
    })

    const pills = labelGroup
      .selectAll('.label-pill')
      .data(labelData)
      .enter()
      .append('rect')
      .attr('class', 'label-pill')
      .attr('x', (d) => d.midX - 36)
      .attr('y', (d) => d.midY - 10)
      .attr('width', 72)
      .attr('height', 20)
      .attr('rx', 10)
      .attr('fill', (d) => getRelColor(d.rel.type).bg)
      .attr('stroke', (d) => getRelColor(d.rel.type).stroke)
      .attr('stroke-width', 1)
      .attr('opacity', 0)
      .style('pointer-events', 'none')

    const pillTexts = labelGroup
      .selectAll('.label-pill-text')
      .data(labelData)
      .enter()
      .append('text')
      .attr('class', 'label-pill-text')
      .attr('x', (d) => d.midX)
      .attr('y', (d) => d.midY + 4)
      .attr('text-anchor', 'middle')
      .attr('font-size', '9px')
      .attr('font-weight', '600')
      .attr('letter-spacing', '0.04em')
      .attr('fill', (d) => getRelColor(d.rel.type).label)
      .attr('opacity', 0)
      .text((d) => d.relType)
      .style('pointer-events', 'none')

    pills.transition().delay((d, i) => 400 + i * 60).duration(300).attr('opacity', 1)
    pillTexts.transition().delay((d, i) => 400 + i * 60).duration(300).attr('opacity', 1)

    const spokeNodes = svg
      .selectAll('.spoke-node')
      .data(spokeData)
      .enter()
      .append('g')
      .attr('class', 'spoke-node')
      .attr('transform', `translate(${cx},${cy})`)
      .attr('opacity', 0)
      .style('cursor', 'pointer')
      .on('click', (event, d) => onNodeClick(d.node))

    spokeNodes
      .transition()
      .duration(700)
      .delay((d, i) => i * 60)
      .ease(d3.easeCubicOut)
      .attr('transform', (d) => `translate(${d.x},${d.y})`)
      .attr('opacity', 1)

    spokeNodes
      .append('circle')
      .attr('r', nodeRadius)
      .attr('fill', (d) => (d.node.gender === 'male' ? '#dbeafe' : '#fce7f3'))
      .attr('stroke', (d) => {
        if (highlightPath && highlightPath.includes(d.node.id)) return '#fbbf24'
        return getRelColor(d.rel.type).stroke
      })
      .attr('stroke-width', (d) => (highlightPath && highlightPath.includes(d.node.id) ? 4 : 2.5))
      .attr('filter', 'url(#node-shadow)')

    spokeNodes
      .append('image')
      .attr('x', -nodeRadius)
      .attr('y', -nodeRadius)
      .attr('width', nodeRadius * 2)
      .attr('height', nodeRadius * 2)
      .attr('clip-path', (d) => `url(#clip-spoke-${d.node.id})`)
      .attr('href', (d) => photoHref(d.node))
      .attr('preserveAspectRatio', 'xMidYMid slice')

    spokeNodes
      .append('text')
      .attr('dy', nodeRadius + 16)
      .attr('text-anchor', 'middle')
      .attr('font-size', '11px')
      .attr('font-weight', '700')
      .attr('fill', '#1e293b')
      .text((d) => d.node.name)

    spokeNodes
      .append('text')
      .attr('dy', nodeRadius + 29)
      .attr('text-anchor', 'middle')
      .attr('font-size', '10px')
      .attr('fill', '#94a3b8')
      .text((d) => (d.node.dateOfBirth ? new Date(d.node.dateOfBirth).getFullYear() : ''))

    spokeNodes
      .append('circle')
      .attr('r', nodeRadius + 5)
      .attr('fill', 'none')
      .attr('stroke', (d) => getRelColor(d.rel.type).stroke)
      .attr('stroke-width', 2)
      .attr('opacity', 0)
      .attr('class', 'hover-ring')

    spokeNodes
      .on('mouseenter', function () {
        d3.select(this).select('.hover-ring').transition().duration(150).attr('opacity', 0.5)
        d3.select(this).select('circle').transition().duration(150).attr('r', nodeRadius + 2)
      })
      .on('mouseleave', function () {
        d3.select(this).select('.hover-ring').transition().duration(200).attr('opacity', 0)
        d3.select(this).select('circle').transition().duration(150).attr('r', nodeRadius)
      })

    const rootGroup = svg
      .append('g')
      .attr('class', 'root-node')
      .attr('transform', `translate(${cx},${cy})`)
      .attr('opacity', 0)
      .style('cursor', 'pointer')
      .on('click', () => onNodeClick(rootNode))

    rootGroup.transition().duration(500).attr('opacity', 1)

    rootGroup
      .append('circle')
      .attr('r', rootRadius + 10)
      .attr('fill', 'none')
      .attr('stroke', '#6366f1')
      .attr('stroke-width', 2)
      .attr('opacity', 0.25)
      .attr('filter', 'url(#root-glow)')

    rootGroup
      .append('circle')
      .attr('r', rootRadius)
      .attr('fill', rootNode.gender === 'male' ? '#dbeafe' : '#fce7f3')
      .attr('stroke', '#6366f1')
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

    const usedTypes = [...new Set(connectedRels.map((r) => r.type))]
    const legend = svg.append('g').attr('transform', 'translate(20, 20)')
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
  }, [data, highlightPath, rootPersonId, onNodeClick])

  return (
    <div className="bg-white rounded-2xl shadow-xl border border-slate-100 p-4 overflow-auto scrollbar-thin" style={{ minHeight: '500px' }}>
      <svg ref={svgRef} />
    </div>
  )
}
