"use client";

import { useRef, useState } from "react";
import Draggable from "react-draggable";
import Note from "./Note";
import { BORDER_WIDTH, GRID_SIZE } from "@/util/config";
import Button from "./Button";

export const EDITOR_WIDTH = 960, EDITOR_HEIGHT = 600;

export default function Editor() {
  // State to force update
  const [_, _upd] = useState(0);
  // Positions of the notes [[x, y, duration], ...]
  const notes = useRef<number[][]>([]);

  const forceUpdate = () => _upd(x => x + 1);

  const getUpdateNoteHandler = (i: number) => {
    return (newPos: number[], newDuration: number) => {
      newPos.push(newDuration);
      notes.current[i] = newPos;
      forceUpdate();
    }
  }

  const onAddNote = () => {
    const x = notes.current.reduce((max, pos) => Math.max(max, pos[0] + pos[2] * GRID_SIZE), 0);
    if (x >= EDITOR_WIDTH) {
      console.log("Cannot add note, out of space");
      return;
    }
    notes.current.push([x, 0, 2]);
    forceUpdate();
  };

  return (
    <div>
      <div className={`m-auto relative overflow-hidden border-4 border-black border-solid`} style={{width: EDITOR_WIDTH, height: EDITOR_HEIGHT}}>
        <div className="relative w-full h-0 m-auto">
          <svg className="absolute m-auto left-0 grid-border" width={EDITOR_WIDTH} height={EDITOR_HEIGHT} strokeWidth={BORDER_WIDTH}>
            <rect width={EDITOR_WIDTH} height={EDITOR_HEIGHT} fill="url(#grid)" />
            <defs>
              <pattern id="grid" width={GRID_SIZE} height={GRID_SIZE} patternUnits="userSpaceOnUse">
                <line x1={0} y1={0} x2={0} y2={GRID_SIZE} />
                <line x1={0} y1={0} x2={GRID_SIZE} y2={0} />
                <line x1={0} y1={GRID_SIZE} x2={GRID_SIZE} y2={GRID_SIZE} />
                <line x1={GRID_SIZE} y1={0} x2={GRID_SIZE} y2={GRID_SIZE} />
              </pattern>
            </defs>
          </svg>
        </div>
        <div className="relative w-full h-full">
          {
            notes.current.map((pos, i) => <Note key={i} position={pos} duration={pos[2]} updateNote={getUpdateNoteHandler(i)} />)
          }
        </div>
      </div>
      <div className="m-auto w-[80%]">
        <h1>Generation Options</h1>
        <Button onClick={onAddNote}>Add Note</Button>
      </div>
    </div>
  );
}