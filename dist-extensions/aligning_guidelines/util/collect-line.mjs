import { getDistanceList } from "./basic.mjs";
//#region extensions/aligning_guidelines/util/collect-line.ts
function collectLine(target, points, list) {
	const opts = {
		target,
		list,
		points,
		margin: this.margin / this.canvas.getZoom()
	};
	return {
		vLines: collectPoints({
			...opts,
			type: "x"
		}),
		hLines: collectPoints({
			...opts,
			type: "y"
		})
	};
}
function collectPoints(props) {
	const { target, list, points, margin, type } = props;
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
		for (const item of arr[i].arr) res.push({
			origin: list[i],
			target: item
		});
		if (b) continue;
		b = true;
		const d = arr[i].arr[0][type] - list[i][type];
		list.forEach((item) => {
			item[type] += d;
		});
		if (type === "x") target.set("left", target.left + d);
		else target.set("top", target.top + d);
		target.setCoords();
	}
	return res;
}
//#endregion
export { collectLine };

//# sourceMappingURL=collect-line.mjs.map