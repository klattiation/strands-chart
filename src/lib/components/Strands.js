import React from "react"
import noop from "lodash/noop"
import isNil from "lodash/isNil"
import { select, event } from "d3-selection"
import { scaleLinear } from "d3-scale"
import { transition } from "d3-transition"
import {
  makeMatureArea,
  makeDeadArea,
  makeNewBornArea,
} from "../models/areaUtils"
import { getDomainX, getDomainY } from "../models/strandUtils"
import { ATTR_DATA, getData, getColor, getKey } from "../models/selectors"
import { reverse, atLeastOneDiffers } from "../utils"
import { bem } from "./StrandsChart"
import { seqs2strands } from "../models/strandsConverter"
import { StrandsPropTypes } from "../propTypes"

const BEM_EL = "strand"
const BEM_MOD_HI = "highlight"
const BEM_MOD_LO = "lowlight"

const getClassNameHighlight = () => bem(BEM_EL, BEM_MOD_HI)
const getClassNameLowlight = () => bem(BEM_EL, BEM_MOD_LO)

const getNodeByIndex = (svg, idx) =>
  svg
    .selectAll("path")
    .filter((d, i) => i === idx)
    .node()

const addClass = className =>
  function() {
    select(this).classed(className, true)
  }

const removeClass = className =>
  function() {
    select(this).classed(className, false)
  }

class Strands extends React.Component {
  constructor(props) {
    super(props)
    this.svg = React.createRef()
    this.getSequences = this.getSequences.bind(this)
    this.startMoveTracking = this.startMoveTracking.bind(this)
    this.handleMouseMove = this.handleMouseMove.bind(this)
    this.stopMoveTracking = this.stopMoveTracking.bind(this)
  }

  getSequences() {
    return this.props.sequences
  }

  startMoveTracking(d, idx) {
    if (window) {
      select(window)
        .on("mousemove", this.handleMouseMove(d, idx))
        .on("mouseup", this.stopMoveTracking)
    }
  }

  handleMouseMove(d, idx) {
    return () => {
      const pos = [event.pageX, event.pageY]
      if (this.props.onMouseMove) {
        this.props.onMouseMove(pos, d, idx)
      }
    }
  }

  stopMoveTracking() {
    select(window)
      .on("mousemove", null)
      .on("mouseup", null)
  }

  componentDidMount() {
    this.d3Svg = select(this.svg.current)
    this.updateViz(this.props, this.d3Svg, true)
  }

  componentWillUnmount() {
    this.stopMoveTracking()
  }

  componentWillReceiveProps(nextProps) {
    this.updateViz(nextProps, this.d3Svg, false)
  }

  shouldComponentUpdate(nextProps) {
    return atLeastOneDiffers(this.props, nextProps, ["width", "height"])
  }

  updateViz(props, svg, isInitial) {
    const {
      width,
      height,
      curving,
      padding,
      sequences,
      selectedIdx,
      onMouseEnterStrand = noop,
      onMouseLeaveStrand = noop,
      onClickStrand = noop,
    } = props

    const strands = seqs2strands(sequences, ATTR_DATA)
    const strandsData = strands.map(getData)

    const scaleX = scaleLinear()
      .domain(getDomainX(strandsData))
      .range([0, width])

    const scaleY = scaleLinear()
      .domain(getDomainY(strandsData))
      .range([height, 0])

    const duration = isInitial ? 0 : 400

    const t = transition().duration(duration)
    const tEnter = transition().duration(duration)
    if (isInitial) {
      tEnter.delay(duration / 10)
    }

    const newBornArea = makeNewBornArea(curving, scaleX, scaleY, getData)
    const matureArea = makeMatureArea(curving, scaleX, scaleY, getData)
    const deadArea = makeDeadArea(curving, scaleX, scaleY, getData)

    const highlight = function(d, i) {
      const classNameLowlight = getClassNameLowlight()
      const classNameHighlight = getClassNameHighlight()
      const others = svg.selectAll("path").filter((el, idx) => i !== idx)
      others.each(removeClass(classNameHighlight))
      others.each(addClass(classNameLowlight))
      removeClass(classNameLowlight).call(this)
      addClass(classNameHighlight).call(this)
    }

    const resetHighlight = function() {
      const classNameLowlight = getClassNameLowlight()
      const classNameHighlight = getClassNameHighlight()
      const all = svg.selectAll("path")
      all.each(removeClass(classNameHighlight))
      all.each(removeClass(classNameLowlight))
    }

    const handleMouseOver = d => {
      const seqs = this.getSequences()
      const idx = seqs.findIndex(s => s.key === d.key)
      onMouseEnterStrand(d, idx, [...seqs])
      this.startMoveTracking(d, idx)
    }

    const handleMouseOut = d => {
      const seqs = this.getSequences()
      const idx = seqs.findIndex(s => s.key === d.key)
      onMouseLeaveStrand(d, idx, [...seqs])
      this.stopMoveTracking(d, idx)
    }

    const handleClick = d => {
      const seqs = this.getSequences()
      const idx = seqs.findIndex(s => s.key === d.key)
      onClickStrand(d, idx, [...seqs])
    }

    const data = reverse(strands)
    const paths = svg.selectAll("path").data(data, getKey)

    paths
      .enter()
      .append("path")
      .attr("class", bem("strand"))
      .attr("fill", getColor)
      .attr("stroke-width", 0)
      .attr("d", newBornArea)
      .on("click", handleClick)
      .on("mouseover", handleMouseOver)
      .on("mouseout", handleMouseOut)
      .transition(tEnter)
      .attr("stroke-width", `${padding}px`)
      .attr("d", matureArea)
      .selectAll("path")

    paths
      .merge(paths)
      .transition(t)
      .attr("d", matureArea)

    paths
      .exit()
      .transition(t)
      .attr("d", deadArea)
      .remove()

    resetHighlight()
    if (!isNil(selectedIdx)) {
      const reverseIdx = data.length - 1 - selectedIdx
      highlight.call(getNodeByIndex(svg, reverseIdx))
    }
  }

  render() {
    const { width, height } = this.props
    return (
      <div className={bem(BEM_EL)}>
        <svg
          width={width}
          height={height}
          viewBox={`0 0 ${width} ${height}`}
          preserveAspectRatio="none"
          ref={this.svg}
        />
      </div>
    )
  }
}

Strands.propTypes = StrandsPropTypes

export default Strands
