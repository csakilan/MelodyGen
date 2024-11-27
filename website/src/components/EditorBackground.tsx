"use client";
import { BORDER_WIDTH, GRID_SIZE_Y, NOTE_COUNT, PIANO_KEY_GAP, PIANO_KEY_WIDTH, QUARTER_GRID_X } from "@/util/config";
import React, { useContext, useRef, useState } from "react";
import { EDITOR_HEIGHT, EditorContext, getNoteColor, noteIdToPosition, NoteInfo, notePositionToId } from "./Editor";
import Note from "./Note";

interface EditorBackgroundProps {
  musicKey: number;
  octave: number;
  notes: NoteInfo[];
  generatedMelodies: NoteInfo[][];
  hoveredMelody: number;
  selectedMelody: number;
  onTestNote: (note: number, shouldRelease?: boolean) => void;
  getUpdateNoteHandler: (index: number) => (newNote: NoteInfo) => void;
}

export function EditorBackground({ musicKey: key, octave, notes, generatedMelodies, hoveredMelody, selectedMelody, onTestNote, getUpdateNoteHandler }: EditorBackgroundProps) {
  const { EDITOR_WIDTH, MAX_GRID_X, verticalLinesPerQuarter, verticalLinesPerWhole, verticalLineBeatInterval } = useContext(EditorContext);
  const [hoveredIndex, setHoveredIndex] = useState(-1);
  const editorRef = useRef<HTMLDivElement>(null);
  const internalEditorRef = useRef<HTMLDivElement>(null);

  const onMouseMove = (e: React.MouseEvent) => {
    const rect = editorRef.current?.getBoundingClientRect();
    if (!rect)
      return;
    const mouseX = e.clientX - rect.left - 4, mouseY = e.clientY - rect.top - 4;
    if (mouseY < 0 || mouseY >= EDITOR_HEIGHT || mouseX < 0 || mouseX >= EDITOR_WIDTH + PIANO_KEY_GAP + PIANO_KEY_WIDTH) {
      setHoveredIndex(-1);
      return;
    }
    setHoveredIndex(Math.floor(notePositionToId([0, mouseY])[1]) + 1);
  };

  return (
    <div ref={editorRef} className={`m-auto relative overflow-hidden border-4 border-black border-solid w-fit flex flex-row`} style={{ height: EDITOR_HEIGHT }} onMouseEnter={onMouseMove} onMouseMove={onMouseMove} onMouseLeave={onMouseMove}>
      <div className="h-full">
        <svg className="select-none" width={PIANO_KEY_WIDTH + PIANO_KEY_GAP} height={EDITOR_HEIGHT}>
          <rect className="grid-border-quarter" width={PIANO_KEY_WIDTH} height={EDITOR_HEIGHT} fill="none" />
          <g className="grid-border">
            { /* Piano keys */
              Array(NOTE_COUNT).fill(0).map((_, i) => {
                const y = noteIdToPosition([0, i + 1])[1];
                return (
                  <g key={y}>
                    <rect onMouseDown={() => onTestNote(i + 1)} onMouseUp={() => onTestNote(i + 1, true)} x={0} y={y} width={PIANO_KEY_WIDTH} height={GRID_SIZE_Y} fill={getNoteColor(key, i + 1, i + 1 === hoveredIndex)} />
                    {(i + key) % 12 === 0 && <text x={PIANO_KEY_WIDTH - 4} y={y + GRID_SIZE_Y / 2} dominantBaseline="middle" textAnchor="end" fontSize={GRID_SIZE_Y - 2}>C{Math.floor((i + key) / 12) + octave}</text>}
                  </g>
                );
              })
            }
            <rect x={0} y={EDITOR_HEIGHT - GRID_SIZE_Y} width={PIANO_KEY_WIDTH} height={GRID_SIZE_Y} fill="black" />
            <text x={PIANO_KEY_WIDTH - 4} y={EDITOR_HEIGHT - GRID_SIZE_Y / 2} dominantBaseline="middle" textAnchor="end" fontSize={GRID_SIZE_Y - 2} fill="white">rest</text>
          </g>
          <rect x={PIANO_KEY_WIDTH} y={0} width={PIANO_KEY_GAP} height={EDITOR_HEIGHT} fill="#000" />
        </svg>
      </div>
      <div style={{ width: EDITOR_WIDTH, height: EDITOR_HEIGHT }} ref={internalEditorRef}>
        <div className="relative w-full h-0 m-auto">
          <svg className="absolute m-auto left-0" width={EDITOR_WIDTH} height={EDITOR_HEIGHT} strokeWidth={BORDER_WIDTH}>
            <g>
              {/* Highlight root note bars */}
              {Array(NOTE_COUNT).fill(0).map((_, i) => i).filter(i => i % 12 === 0).map(i => {
                const y = noteIdToPosition([0, i + 1])[1];
                return <rect className="root-note" key={i} x={0} y={y} width={EDITOR_WIDTH} height={GRID_SIZE_Y} />
              })}
              { /* Hovered pitch bar */}
              {hoveredIndex !== -1 && <rect className="hovered-note" x={0} y={noteIdToPosition([0, hoveredIndex])[1]} width={EDITOR_WIDTH} height={GRID_SIZE_Y} />}
            </g>
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
          {/* Generated notes */}
          {
            generatedMelodies.map((melody, melodyIndex) =>
              <div key={melodyIndex} className="absolute">
                {melody.map((note, i) => (
                  <Note
                    key={i}
                    info={note}
                    lastNote={i == notes.length - 1}
                    updateNote={getUpdateNoteHandler(i)}
                    editorRef={internalEditorRef}
                    draggable={false}
                    optionIndex={melodyIndex + 1}
                    saturated={melodyIndex === selectedMelody || selectedMelody === -1 && melodyIndex === hoveredMelody}
                    hide={selectedMelody >= 0 && melodyIndex !== selectedMelody && melodyIndex !== hoveredMelody}
                  />))
                }
              </div>
            )
          }
          {/* User notes */}
          <div className="absolute">
            {
              notes.map((note, i) => (
                <Note
                  key={i}
                  info={note}
                  lastNote={i == notes.length - 1}
                  updateNote={getUpdateNoteHandler(i)}
                  editorRef={internalEditorRef}
                />
              ))
            }
          </div>
        </div>
      </div>
    </div>
  );
}