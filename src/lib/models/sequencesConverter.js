import isNil from "lodash/isNil"
import compose from "lodash/fp/compose"
import { ATTR_COLOR, ATTR_DIRECTION } from "./selectors"

/**
 * Converts the base format grouped by years into strands grouped by data items.
 *
 * Algorithm:
 * - sort raw data by year
 * - make a sequence array for each language
 * - replace null-values in the middle with 0-values
 * - sort strands by surface area
 *
 * Base format:
 * [
 *   {
 *     "year": 2005,
 *     "data": {
 *       "js": 1,
 *       "php": 2,
 *       "cpp": 1,
 *       "vba": 2,
 *       "mysql": 2
 *     }
 *   },
 *   ...
 * ]
 *
 * Target format:
 * [
 *   {
 *     key: "js",
 *     data: [0, 1, 2, 2, 3, 1, 0, 0, 0, 1, 0],
 *   },
 *   {
 *     key: "php",
 *     data: [0, 1, 2, 3, 3, 4, 4, 3, 0, 1, 0],
 *   },
 *   ...
 * ]
 */

const getYear = d => (d && d.year ? d.year : null)

const getData = d => (d && d.data ? d.data : [])

const makeValueSelector = d => value => getData(d)[value] || 0

const asc = selector => (a, b) => selector(a) - selector(b)

const uniqueList = (list, key) =>
  list.includes(key) ? [...list] : [...list, key]

const filterKeys = selector => arr =>
  arr.reduce(
    (list, entry) => Object.keys(selector(entry)).reduce(uniqueList, list),
    []
  )

const keysToObject = keys =>
  keys.reduce((acc, key) => ({ ...acc, [key]: [] }), {})

const toArray = obj =>
  Object.entries(obj).map(([key, data]) => ({
    key,
    data,
  }))

const putValuesIntoList = keys => (acc, d) => {
  const getValue = makeValueSelector(d)
  keys.forEach(key => acc[key].push(getValue(key))) // FIXME: push() is IMPURE!
  return acc
}

const nil2zero = v => (isNil(v) || isNaN(v) ? 0 : v)

const sum = (a, b) => nil2zero(a) + nil2zero(b)

const getSurfaceArea = strand => strand.reduce(sum, 0)

const descSurfaceArea = selector => (a, b) =>
  getSurfaceArea(selector(b)) - getSurfaceArea(selector(a))

const sortByYear = input => [...input].sort(asc(getYear))

const toKeyListObject = keys => arr =>
  arr.reduce(putValuesIntoList(keys), keysToObject(keys))

const sortBySurfaceArea = arr => arr.sort(descSurfaceArea(getData))

const addColors = colors => arr =>
  arr.map((v, idx) => ({
    ...v,
    [ATTR_COLOR]: colors[idx % colors.length],
  }))

const addDirection = arr =>
  arr.map((d, i) => ({
    ...d,
    [ATTR_DIRECTION]: i % 2 ? 1 : -1,
  }))

export const importSequences = (input, colors) => {
  const sorted = sortByYear(input)
  const keys = filterKeys(getData)(sorted)
  return compose(
    addDirection,
    addColors(colors),
    sortBySurfaceArea,
    toArray,
    toKeyListObject(keys)
  )(sorted)
}
