"use client";

import { useRef, useState } from "react";
import Draggable from "react-draggable";
import Note from "./Note";
import { BORDER_WIDTH, GRID_ROWS, GRID_SIZE_X, GRID_SIZE_Y, LOWEST_OCTAVE, MAX_GRID_X, PIANO_KEY_GAP, PIANO_KEY_WIDTH, QUARTER_GRID_X } from "@/util/config";
import Button from "./Button";

export const EDITOR_COLS = 4 * 4 * 8;
export const EDITOR_WIDTH = EDITOR_COLS * GRID_SIZE_X, EDITOR_HEIGHT = GRID_SIZE_Y * GRID_ROWS;

const B = "#000", W = "#fff";
const noteColors = [W, B, W, B, W, W, B, W, B, W, B, W];
const noteNames = ["C", "C#", "D", "E♭", "E", "F", "F#", "G", "G#", "A", "B♭", "B"];
const getNoteColor = (key: number, note: number) => {
  return noteColors[(key + note - 1 + noteColors.length) % noteColors.length];
};

const getNoteIndex = (y: number) => {
  return GRID_ROWS - y / GRID_SIZE_Y;
}

export const noteIdToPosition = (note: number[]) => {
  return [note[0] * GRID_SIZE_X, EDITOR_HEIGHT - note[1] * GRID_SIZE_Y];
};

export const notePositionToId = (pos: number[]) => {
  return [pos[0] / GRID_SIZE_X, GRID_ROWS - pos[1] / GRID_SIZE_Y];
}

export default function Editor() {
  // State to force update
  const [_, _upd] = useState(0);
  // TODO change instead of position to offset and note id (1, 2, 3, ...) instead of (0, 16, 32, ...)
  // Positions of the notes [[x, y, duration], ...]
  const notes = useRef<number[][]>([]);
  const [gridMultiplier, setGridMultiplier] = useState(2);
  const [key, setKey] = useState(0);

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
    const x = notes.current.reduce((max, pos) => Math.max(max, pos[0] + pos[2]), 0);
    if (x >= EDITOR_COLS) {
      console.log("Cannot add note, out of space");
      return;
    }
    notes.current.push([x, 1, Math.min(4, EDITOR_COLS - x)]);
    forceUpdate();
  };

  const onRemoveNote = () => {
    if (notes.current.length == 0) {
      console.log("No notes to remove");
      return;
    }
    notes.current.pop();
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
                const y = noteIdToPosition([0, i + 1])[1];
                return (
                  <g key={y}>
                    <rect x={0} y={y} width={PIANO_KEY_WIDTH} height={GRID_SIZE_Y} fill={getNoteColor(key, i + 1)} />
                    { (i + key) % 12 === 0 && <text x={PIANO_KEY_WIDTH - 4} y={y + GRID_SIZE_Y / 2} dominantBaseline="middle" textAnchor="end" fontSize={GRID_SIZE_Y - 2}>C{Math.floor((i + key) / 12) + LOWEST_OCTAVE}</text> }
                  </g>
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
          <select value={key} onChange={(e) => setKey(parseInt(e.target.value))}>
            {
              Array(12).fill(0).map((_, i) => 11 - i).map(i => <option key={i} value={i}>{noteNames[i]}</option>)
            }
          </select>
          <Button onClick={onAddNote}>Add Note</Button>
          <Button onClick={onRemoveNote}>Remove Last Note</Button>
          <Button onClick={() => console.log(notes.current)}>Log Notes</Button>
        </div>
      </div>
    </div>
  );
}