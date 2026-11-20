/** sticky 契約者列の不透明背景(透過だと横スクロール時に下の列が透ける) (#305 A3) */
export function stickyCellBg(view: { expired: boolean; near: boolean }): string {
  return view.expired ? 'bg-red-50' : view.near ? 'bg-orange-50' : 'bg-white';
}
