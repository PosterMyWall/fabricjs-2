import { getDistanceList } from './basic.mjs';

function collectLine(target, points, list) {
  const margin = this.margin / this.canvas.getZoom();
  const opts = {
    target,
    list,
    points,
    margin
  };
  const vLines = collectPoints({
    ...opts,
    type: 'x'
  });
  const hLines = collectPoints({
    ...opts,
    type: 'y'
  });
  return {
    vLines,
    hLines
  };
}
function collectPoints(props) {
  const {
    target,
    list,
    points,
    margin,
    type
  } = props;
  const res = [];
  const arr = [];
  let min = Infinity;
  for (const item of list) {
    const o = getDistanceList(item, points, type);
    arr.push(o);
    if (min > o.dis) min = o.dis;
  }
  if (min > margin) return res;
  let b = false;
  for (let i = 0; i < list.length; i++) {
    if (arr[i].dis != min) continue;
    for (const item of arr[i].arr) {
      res.push({
        origin: list[i],
        target: item
      });
    }
    if (b) continue;
    b = true;
    const d = arr[i].arr[0][type] - list[i][type];
    // It will change the original data, and the next time we collect y, use the modified data.
    list.forEach(item => {
      item[type] += d;
    });
    // Apply the snap as a translation on target. Works whether `list` came from target
    // itself or from a sub-object (e.g. an inner text content box used as reference).
    if (type === 'x') target.set('left', target.left + d);
    else target.set('top', target.top + d);
    target.setCoords();
  }
  return res;
}

export { collectLine };
//# sourceMappingURL=collect-line.mjs.map
