require('d3-octree')

declare module 'd3-octree' {

  type Node = {
    data: any
    length: number
    next: Node
  }

  interface Octree {
    x: function((d: any) => number): Octree
    y: function((d: any) => number): Octree
    z: function((d: any) => number): Octree
    addAll: function(any[]): Octree
    visit: function(function(Node, number, number, number, number, number, number): boolean): void
  }

  export function octree(): Octree

  // export default { octree }

}