"use client";

import { useEffect, useRef, useState } from "react";
import Note from "./Note";
import {
  GRID_ROWS,
  GRID_SIZE_X,
  GRID_SIZE_Y,
  LOWEST_OCTAVE,
  MAX_MEASURES,
  MIN_MEASURES,
  NOTE_COUNT,
  PIANO_KEY_GAP,
  PIANO_KEY_WIDTH,
  QUARTER_SUBDIVISIONS,
} from "@/util/config";
import Button from "./Button";
import * as Tone from "tone";
import Slider from "./Slider";
import { EditorBackground } from "./EditorBackground";

// export const EDITOR_COLS = QUARTER_SUBDIVISIONS * QUARTERS_PER_BAR * 8;
// export const EDITOR_WIDTH = EDITOR_COLS * GRID_SIZE_X;
export const EDITOR_HEIGHT = GRID_SIZE_Y * GRID_ROWS;

export type NoteInfo = {
  position: number[];
  duration: number;
};

const B = "#000",
  W = "#fff";
const GB = "#191",
  GW = "#2e2";
const noteColors = [W, B, W, B, W, W, B, W, B, W, B, W];
const noteColorsHover = [GW, GB, GW, GB, GW, GW, GB, GW, GB, GW, GB, GW];
const noteNames = [
  "C",
  "C#",
  "D",
  "E♭",
  "E",
  "F",
  "F#",
  "G",
  "G#",
  "A",
  "B♭",
  "B",
];
const internalNoteNames = [
  "C",
  "C#",
  "D",
  "D#",
  "E",
  "F",
  "F#",
  "G",
  "G#",
  "A",
  "A#",
  "B",
];
export const getNoteColor = (
  key: number,
  note: number,
  hovered: boolean = false
) => {
  const index = (key + note - 1 + noteColors.length) % noteColors.length;
  if (hovered) return noteColorsHover[index];
  return noteColors[index];
};

export const noteIdToPosition = (note: number[]) => {
  return [note[0] * GRID_SIZE_X, EDITOR_HEIGHT - (note[1] + 1) * GRID_SIZE_Y];
};

export const notePositionToId = (pos: number[]) => {
  return [pos[0] / GRID_SIZE_X, NOTE_COUNT - pos[1] / GRID_SIZE_Y];
};

export default function Editor() {
  // State to force update
  const [_, _upd] = useState(0);
  // TODO change instead of position to offset and note id (1, 2, 3, ...) instead of (0, 16, 32, ...)
  // Positions of the notes [[x, y, duration], ...]
  const notes = useRef<NoteInfo[]>([]);
  const backgroundRef = useRef<HTMLDivElement>(null);
  const [gridMultiplier, setGridMultiplier] = useState(2);
  const [key, setKey] = useState(0);
  const [bpm, setBpm] = useState(92);
  const [octave, setOctave] = useState(3);
  const [measureCount, setMeasureCount] = useState(8);
  const [quartersPerBar, setQuartersPerBar] = useState(4);
  const synth = useRef<Tone.Sampler>();
  const previousPart = useRef<Tone.Part>();
  const forceUpdate = () => _upd((x) => x + 1);

  const EDITOR_COLS = QUARTER_SUBDIVISIONS * quartersPerBar * measureCount;
  const EDITOR_WIDTH = EDITOR_COLS * GRID_SIZE_X;
  const MAX_GRID_X = GRID_SIZE_X * QUARTER_SUBDIVISIONS * quartersPerBar;

  const verticalLinesPerQuarter = Math.floor(4 / gridMultiplier);
  // Number of quarter beats in whole (capped at 4)
  const verticalLinesPerWhole = Math.min(16 / gridMultiplier, 4);
  const verticalLineBeatInterval = 4 / verticalLinesPerWhole;

  const getUpdateNoteHandler = (i: number) => {
    return (newNote: NoteInfo) => {
      notes.current[i] = newNote;
      forceUpdate();
    };
  };

  const getInsertPos = () => {
    const x = notes.current.reduce(
      (max, note) => Math.max(max, note.position[0] + note.duration),
      0
    );
    if (x >= EDITOR_COLS) {
      console.log("Cannot add note, out of space");
      return;
    }
    return x;
  };

  const onAddNote = () => {
    const x = getInsertPos();
    if (x === undefined) return;
    notes.current.push({
      position: [x, 13],
      duration: Math.min(QUARTER_SUBDIVISIONS, EDITOR_COLS - x),
    });
    forceUpdate();
  };

  const onAddRest = () => {
    const x = getInsertPos();
    if (x === undefined) return;
    // if (notes.current.length > 0 && notes.current[notes.current.length - 1].position[0] === 0)
    //   notes.current[notes.current.length - 1].duration += Math.min(4, EDITOR_COLS - x);
    // else
    notes.current.push({
      position: [x, 0],
      duration: Math.min(4, EDITOR_COLS - x),
    });
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

  const getDurationStr = (duration: number) =>
    `${duration / QUARTER_SUBDIVISIONS}n`;
  const getTimeStr = (time: number) =>
    `${Math.floor(time / 4 / QUARTER_SUBDIVISIONS)}:${
      (time / QUARTER_SUBDIVISIONS) % 4
    }`;
  const convertNote = (note: NoteInfo) => {
    const noteIndex = note.position[1] + key - 1;
    return {
      time: getTimeStr(note.position[0]),
      note:
        note.position[1] === 0
          ? "rest"
          : `${internalNoteNames[noteIndex % 12]}${
              Math.floor(noteIndex / 12) + octave
            }`,
      duration: getDurationStr(note.duration),
    };
  };

  const onPlayNotes = () => {
    // Play all the notes using Tone.js
    // Use Tone.js so notes play in order and not at the same time
    Tone.getTransport().stop();
    previousPart.current?.dispose();
    const part = (previousPart.current = new Tone.Part(
      (time, value) => {
        if (value.note === "rest") return;
        synth.current?.triggerAttackRelease(value.note, value.duration, time);
      },
      notes.current.map((note) => convertNote(note))
    ));
    part.start();
    Tone.getTransport().bpm.value = bpm;
    Tone.getTransport().start();
  };

  const onTestNote = (id: number, shouldRelease: boolean = false) => {
    if (id === 0) return;
    if (shouldRelease) {
    }
    // synth.current?.triggerRelease(convertNote({position: [0, id], duration: 4}).note, "4n");
    else
      synth.current?.triggerAttackRelease(
        convertNote({ position: [0, id], duration: 4 }).note,
        "3n"
      );
    Tone.getTransport().start();
  };

  const onLogNotes = () => {
    console.log(notes.current);
  };
  const [futureNotes, getPredictions] = useState([]);
  const onPredNotes = async () => {
    const currNotes = [5, 10, 15, 20]; // Example array to send

    try {
      const response = await fetch("/predict", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ array: currNotes }),
      });

      const data = await response.json();
      getPredictions(data.newtings); // Save the response array
      console.log(futureNotes);
    } catch (error) {
      console.error("Error sending data:", error);
    }
  };
  useEffect(() => {
    if (backgroundRef.current)
      backgroundRef.current.onwheel = (e) => {
        e.preventDefault();
        backgroundRef.current!.scrollLeft += e.deltaY;
      };
  }, [backgroundRef]);

  useEffect(() => {
    synth.current = new Tone.Sampler({
      urls: {
        C4: "C4.mp3",
        "D#4": "Ds4.mp3",
        "F#4": "Fs4.mp3",
        A4: "A4.mp3",
      },
      baseUrl: "https://tonejs.github.io/audio/salamander/",
    }).toDestination();
  }, []);

  return (
    <div>
      <div
        ref={backgroundRef}
        className="m-auto overflow-x-auto"
        style={{
          maxWidth:
            8 * GRID_SIZE_X * QUARTER_SUBDIVISIONS * 4 +
            PIANO_KEY_WIDTH +
            PIANO_KEY_GAP +
            8,
        }}
      >
        <EditorBackground
          musicKey={key}
          octave={octave}
          verticalLinesPerQuarter={verticalLinesPerQuarter}
          verticalLinesPerWhole={verticalLinesPerWhole}
          verticalLineBeatInterval={verticalLineBeatInterval}
          notes={
            <div className="relative w-full h-full">
              {notes.current.map((note, i) => (
                <Note
                  key={i}
                  position={note.position}
                  duration={note.duration}
                  gridMultiplier={gridMultiplier}
                  lastNote={i == notes.current.length - 1}
                  EDITOR_WIDTH={EDITOR_WIDTH}
                  updateNote={getUpdateNoteHandler(i)}
                />
              ))}
            </div>
          }
          EDITOR_WIDTH={EDITOR_WIDTH}
          MAX_GRID_X={MAX_GRID_X}
          onTestNote={onTestNote}
        />
      </div>
      <div className="m-auto w-[80%]">
        <h1>Generation Options</h1>
        <div className="grid gap-y-4">
          <div className="flex flex-row gap-x-4 justify-center items-center">
            <div className="text-lg">{measureCount} measures</div>
            <Button
              onClick={() =>
                setMeasureCount((i) => Math.min(MAX_MEASURES, i + 1))
              }
            >
              Add Measure
            </Button>
            <Button
              onClick={() =>
                setMeasureCount((i) => Math.max(MIN_MEASURES, i - 1))
              }
            >
              Remove Measure
            </Button>
          </div>
          <Slider
            className="bpm"
            name="BPM"
            value={bpm}
            min={60}
            max={240}
            step={1}
            onChange={setBpm}
          />
          <div className="flex flex-row gap-x-4 justify-center items-center">
            <label htmlFor="grid-subdivision">Grid</label>
            <select
              id="grid-subdivision"
              value={gridMultiplier}
              onChange={(e) => setGridMultiplier(parseInt(e.target.value))}
            >
              <option value={1}>16th</option>
              <option value={2}>8th</option>
              <option value={4}>Quarter</option>
              <option value={8}>Half</option>
              <option value={16}>Whole</option>
            </select>
            <label htmlFor="time-signature">Time Signature</label>
            <select
              id="time-signature"
              value={quartersPerBar}
              onChange={(e) => setQuartersPerBar(parseInt(e.target.value))}
            >
              <option value={3}>3/4</option>
              <option value={4}>4/4</option>
            </select>
            <label htmlFor="key-signature">Key</label>
            <select
              id="key-signature"
              value={key}
              onChange={(e) => setKey(parseInt(e.target.value))}
            >
              {Array(12)
                .fill(0)
                .map((_, i) => 11 - i)
                .map((i) => (
                  <option key={i} value={i}>
                    {noteNames[i]}
                  </option>
                ))}
            </select>
            <label htmlFor="octave">Octave</label>
            <select
              id="octave"
              value={octave}
              onChange={(e) => setOctave(parseInt(e.target.value))}
            >
              {Array(3)
                .fill(0)
                .map((_, i) => 2 - i + LOWEST_OCTAVE)
                .map((i) => (
                  <option key={i} value={i}>
                    {i}
                  </option>
                ))}
            </select>
          </div>
          <div className="flex flex-row gap-x-4 justify-center items-center">
            <Button onClick={onAddNote}>Add Note</Button>
            <Button onClick={onAddRest}>Add Rest</Button>
            <Button onClick={onRemoveNote}>Remove Last Note</Button>
            <Button onClick={onLogNotes}>Log Notes</Button>
            <Button onClick={onPlayNotes}>Play Notes</Button>
            <Button onClick={onPredNotes}>Generate</Button>
            <h3>Saved Arrays:</h3>
            <pre>{JSON.stringify(futureNotes, null, 2)}</pre>
          </div>
        </div>
      </div>
    </div>
  );
}
