import type {Component} from "svelte";

export interface Widget {
  component: Component,
  defaultSize: {
    width: number;
    height: number;
  }
}
