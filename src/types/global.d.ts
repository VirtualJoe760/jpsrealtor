/* eslint-disable no-var */
// src/global.d.ts

import mongoose from 'mongoose';

// Existing mongoose declarations
declare global {
  var mongoose: {
    conn: mongoose.Connection | null;
    promise: Promise<mongoose.Connection> | null;
  };
}

// Add type declarations for unist-util-visit
declare module 'unist-util-visit' {
  import { Node } from 'unist';

  type Visitor = (node: Node, index: number | null, parent: Node | null) => void | Promise<void>;

  export function visit(tree: Node, type: string, visitor: Visitor): void;
}
