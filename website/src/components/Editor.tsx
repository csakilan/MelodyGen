"use client";

import { useRef, useState } from "react";
import Draggable from "react-draggable";
import Note from "./Note";
import { BORDER_WIDTH, GRID_ROWS, GRID_SIZE_X, GRID_SIZE_Y, MAX_GRID_X, PIANO_KEY_GAP, PIANO_KEY_WIDTH, QUARTER_GRID_X } from "@/util/config";
import Button from "./Button";

export const EDITOR_WIDTH = GRID_SIZE_X * 4 * 4 * 8, EDITOR_HEIGHT = GRID_SIZE_Y * GRID_ROWS;

const B = "#000", W = "#fff";
const noteColors = [W, B, W, B, W, W, B, W, B, W, B, W];
const getNoteColor = (key: number, note: number) => {
  return noteColors[(key + note - 1 + noteColors.length) % noteColors.length];
};

function getNoteIndex(y: number) {
  return GRID_ROWS - y / GRID_SIZE_Y;
}

export default function Editor() {
  // State to force update
  const [_, _upd] = useState(0);
  // TODO change instead of position to offset and note id (1, 2, 3, ...) instead of (0, 16, 32, ...)
  // Positions of the notes [[x, y, duration], ...]
  const notes = useRef<number[][]>([]);
  const [gridMultiplier, setGridMultiplier] = useState(2);

  const forceUpdate = () => _upd(x => x + 1);

  const verticalLinesPerQuarter = Math.floor(4 / gridMultiplier);
  // Number of quarter beats in whole (capped at 4)
  const verticalLinesPerWhole = Math.min(16 / gridMultiplier, 4);
  const verticalLineBeatInterval = 4 / verticalLinesPerWhole;

  const getUpdateNoteHandler = (i: number) => {
    return (newPos: number[], newDuration: number) => {
      newPos.push(newDuration);
      notes.current[i] = newPos;
      forceUpdate();
    }
  }

  const onAddNote = () => {
    const x = notes.current.reduce((max, pos) => Math.max(max, pos[0] + pos[2] * GRID_SIZE_X), 0);
    if (x >= EDITOR_WIDTH) {
      console.log("Cannot add note, out of space");
      return;
    }
    notes.current.push([x, 0, 4]);
    forceUpdate();
  };

  return (
    <div>
      <div className={`m-auto relative overflow-hidden border-4 border-black border-solid w-fit flex flex-row`} style={{height: EDITOR_HEIGHT}}>
        <div className="h-full">
          <svg width={PIANO_KEY_WIDTH + PIANO_KEY_GAP} height={EDITOR_HEIGHT}>
            <rect className="grid-border-quarter" width={PIANO_KEY_WIDTH} height={EDITOR_HEIGHT} fill="none" />
            <g className="grid-border">
            {
              Array(GRID_ROWS).fill(0).map((_, i) => {
                const y = i * GRID_SIZE_Y;
                return (
                    <rect key={i} x={0} y={y} width={PIANO_KEY_WIDTH} height={GRID_SIZE_Y} fill={getNoteColor(0, getNoteIndex(GRID_SIZE_Y * i))} />
                );
              })
            }
            </g>
            <rect x={PIANO_KEY_WIDTH} y={0} width={PIANO_KEY_GAP} height={EDITOR_HEIGHT} fill="#000" />
          </svg>
        </div>
        <div style={{width: EDITOR_WIDTH, height: EDITOR_HEIGHT}}>
          <div className="relative w-full h-0 m-auto">
            <svg className="absolute m-auto left-0" width={EDITOR_WIDTH} height={EDITOR_HEIGHT} strokeWidth={BORDER_WIDTH}>
              <rect className="grid-border-whole" width={EDITOR_WIDTH} height={EDITOR_HEIGHT} fill="url(#grid)" />
              <defs>
                <pattern id="grid" width={MAX_GRID_X} height={GRID_SIZE_Y} patternUnits="userSpaceOnUse">
                  {/* Vertical lines */}
                  <g className="grid-border-whole">
                    <line x1={0} y1={0} x2={0} y2={GRID_SIZE_Y} />
                    <line x1={MAX_GRID_X} y1={0} x2={MAX_GRID_X} y2={GRID_SIZE_Y} />
                  </g>
                  <g className="grid-border-quarter">
                    {/* Horizontal lines */}
                    <line x1={0} y1={0} x2={MAX_GRID_X} y2={0} />
                    <line x1={0} y1={GRID_SIZE_Y} x2={MAX_GRID_X} y2={GRID_SIZE_Y} />
                  </g>
                  <g className="grid-border">
                    {
                      verticalLinesPerQuarter >= 1 && Array(verticalLinesPerWhole).fill(0).flatMap((_, qi) => {
                        const quarterX = qi * verticalLineBeatInterval * QUARTER_GRID_X;
                        return Array(verticalLinesPerQuarter - 1).fill(0).map((_, i) => {
                          const x = ((i + 1) / verticalLinesPerQuarter) * QUARTER_GRID_X + quarterX;
                          return <line key={qi * verticalLinesPerQuarter + i} x1={x} y1={0} x2={x} y2={GRID_SIZE_Y} />;
                        })
                      })
                    }
                  </g>
                  <g className="grid-border-quarter">
                    {
                      Array(verticalLinesPerWhole - 1).fill(0).flatMap((_, qi) => {
                        const quarterX = (qi + 1) * verticalLineBeatInterval * QUARTER_GRID_X;
                        return <line key={qi + 100} x1={quarterX} y1={0} x2={quarterX} y2={GRID_SIZE_Y} />;
                      })
                    }
                  </g>
                </pattern>
              </defs>
            </svg>
          </div>
          <div className="relative w-full h-full">
            {
              notes.current.map((pos, i) => <Note key={i} position={pos} duration={pos[2]} gridMultiplier={gridMultiplier} lastNote={i == notes.current.length - 1} updateNote={getUpdateNoteHandler(i)} />)
            }
          </div>
        </div>
      </div>
      <div className="m-auto w-[80%]">
        <h1>Generation Options</h1>
        <div className="flex flex-row gap-x-4 justify-center items-center">
          <select value={gridMultiplier} onChange={(e) => setGridMultiplier(parseInt(e.target.value))}>
            <option value={1}>16th</option>
            <option value={2}>8th</option>
            <option value={4}>Quarter</option>
            <option value={8}>Half</option>
            <option value={16}>Whole</option>
          </select>
          <Button onClick={onAddNote}>Add Note</Button>
        </div>
      </div>
    </div>
  );
}