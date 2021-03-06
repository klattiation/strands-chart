import { min, max } from "d3-array"
import { scaleTime } from "d3-scale"
import { isLast } from "../utils"
import compose from "lodash/fp/compose"
import {
  ATTR_TIME,
  ATTR_DATA,
  ATTR_KEY,
  ATTR_HEIGHT,
  ATTR_Y,
} from "./selectors"
import { getData, getTime } from "./selectors"

const nestData = periods => periods.map(p => ({ [ATTR_DATA]: { ...p } }))

const addTime = getDate => periods =>
  periods.map(p => ({
    ...p,
    [ATTR_TIME]: compose(
      getDate,
      getData
    )(p),
  }))

const addY = scaleY => periods =>
  periods.map(period => ({
    ...period,
    [ATTR_Y]: compose(
      Math.round,
      scaleY,
      getTime
    )(period),
  }))

const addHeight = rangeY => periods =>
  periods.map((period, idx, arr) => {
    const nextY = isLast(arr, idx) ? rangeY[1] : arr[idx + 1].y
    return {
      ...period,
      [ATTR_HEIGHT]: Math.round(period.y - nextY),
    }
  })

const addKey = getKey => periods =>
  periods.map(p => ({
    ...p,
    [ATTR_KEY]: getKey(getData(p)),
  }))

export const importTimePeriods = ({
  periods,
  height,
  dateFrom,
  dateTo,
  getKey,
  getDate,
}) => {
  const nestedPeriods = compose(
    addTime(getDate),
    addKey(getKey),
    nestData
  )(periods)
  const domainY = [
    dateFrom || min(nestedPeriods, getTime),
    dateTo || max(nestedPeriods, getTime),
  ]
  const rangeY = [height, 0]
  const scaleY = scaleTime()
    .domain(domainY)
    .range(rangeY)
  return compose(
    addHeight(rangeY),
    addY(scaleY)
  )(nestedPeriods)
}
