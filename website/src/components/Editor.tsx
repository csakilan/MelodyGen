"use client";

import { createContext, useEffect, useRef, useState } from "react";
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
import MelodyOption, { scale } from "./MelodyOption";

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

export interface EditorSettings {
  quartersPerBar: number;
  gridMultiplier: number;
  EDITOR_WIDTH: number;
  verticalLinesPerQuarter: number;
  verticalLinesPerWhole: number;
  verticalLineBeatInterval: number;
  MAX_GRID_X: number;
};

export const EditorContext = createContext<EditorSettings>({quartersPerBar: 4, gridMultiplier: 2, EDITOR_WIDTH: 0, verticalLinesPerQuarter: 4, verticalLinesPerWhole: 4, verticalLineBeatInterval: 1, MAX_GRID_X: 0});

export const GeneratedMelodyColors = ["#fff", "#f44", "#4f4", "#44f"];
export const GeneratedMelodyColorsDesaturated = ["#fff", "#f88", "#bfb", "#88f"];

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
  const [isMinor, setIsMinor] = useState(false);
  const [generatedMelodies, setGeneratedMelodies] = useState<NoteInfo[][]>([]);
  const [hoveredMelody, setHoveredMelody] = useState(-1);
  const [selectedMelody, setSelectedMelody] = useState(-1);
  const [isGenerating, setIsGenerating] = useState(false);
  const [tryingToClear, setTryingToClear] = useState(false);
  const clearTimeoutRef = useRef<NodeJS.Timeout | undefined>();
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
      return -1;
    }
    return x;
  };

  const onAddNote = () => {
    const x = getInsertPos();
    if (x < 0) return;
    notes.current.push({
      position: [x, 13],
      duration: Math.min(QUARTER_SUBDIVISIONS, EDITOR_COLS - x),
    });
    forceUpdate();
  };

  const onAddRest = () => {
    const x = getInsertPos();
    if (x < 0) return;
    // if (notes.current.length > 0 && notes.current[notes.current.length - 1].position[0] === 0)
    //   notes.current[notes.current.length - 1].duration += Math.min(4, EDITOR_COLS - x);
    // else
    notes.current.push({ position: [x, 0], duration: Math.min(QUARTER_SUBDIVISIONS, EDITOR_COLS - x) });
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

  const onClear = () => {
    if (!tryingToClear) {
      setTryingToClear(true);
      clearTimeoutRef.current = setTimeout(() => setTryingToClear(false), 2000);
      return;
    }
    clearTimeout(clearTimeoutRef.current);
    notes.current = [];
    setGeneratedMelodies([]);
    setSelectedMelody(-1);
    setHoveredMelody(-1);
    setTryingToClear(false);
    onStopNotes();
  };

  const onAddMeasure = () => {
    setMeasureCount((i) => Math.min(MAX_MEASURES, i + 1));
  };

  const onRemoveMeasure = () => {
    setMeasureCount((i) => Math.max(MIN_MEASURES, i - 1));
  };

  useEffect(() => {
    const newNotes = notes.current.filter((note) => note.position[0] < EDITOR_COLS);
    if (newNotes.length !== notes.current.length) {
      notes.current = newNotes;
      forceUpdate();
    }
  }, [measureCount]);

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
    onStopNotes();
    const part = (previousPart.current = new Tone.Part(
      (time, value) => {
        if (value.note === "rest") return;
        synth.current?.triggerAttackRelease(value.note, value.duration, time);
      },
      notes.current.concat(selectedMelody >= 0 ? generatedMelodies[selectedMelody] : []).map((note) => convertNote(note))
    ));
    part.start();
    Tone.getTransport().bpm.value = bpm;
    Tone.getTransport().start();
  };

  const onStopNotes = () => {
    Tone.getTransport().stop();
    previousPart.current?.dispose();
  }

  const onTestNote = (id: number, shouldRelease: boolean = false) => {
    if (id === 0) return;
    if (shouldRelease) {
    }
    // synth.current?.triggerRelease(convertNote({position: [0, id], duration: 4}).note, "4n");
    else
      synth.current?.triggerAttackRelease(
        convertNote({ position: [0, id], duration: 4 }).note,
        "1n"
      );
    Tone.getTransport().start();
  };

  const onLogNotes = () => {
    console.log(notes.current);
  };

  const onPredNotes = async () => {
    if (isGenerating)
      return;
    setGeneratedMelodies([]);
    setSelectedMelody(-1);
    setHoveredMelody(-1);
    setIsGenerating(true);
    onStopNotes();
    // Convert notes to model input form
    const currNotes = [];
    // Change durations above 1 to f_part followed by ('C', 'C') for each additional beat
    for (const note of notes.current) {
      let duration = note.duration / QUARTER_SUBDIVISIONS;
      const f_part = duration % 1 == 0 ? 1 : duration % 1;
      currNotes.push([note.position[1], (f_part).toFixed(2)])
      duration -= f_part
      while (duration > 0) {
        currNotes.push(['C', 'C']);
        duration -= 1
      }
    }
    // Add major/minor 4/4
    currNotes.unshift([isMinor ? "minor" : "major", `${quartersPerBar}/4`]);
    
    const setPredictedNotes = ({ notes }: { notes: any[][] }) => {
      // Convert the response array to position/duration
      const newGeneratedMelodies: NoteInfo[][] = [];
      for (const melody of notes) {
        let x = getInsertPos();
        let currentNote: NoteInfo | null = null;
        const generated: NoteInfo[] = [];
        const addCurrentNote = () => {
          if (!currentNote || currentNote.duration + x > EDITOR_COLS)
            return;
          generated.push(currentNote);
          x += currentNote.duration;
        };
        for (const decoding of melody) {
          // Handle "C" (continue)
          if (decoding[0] === "C") {
            if (currentNote == null)
              throw "Invalid decoding, (continue) cannot be the first note";
            currentNote.duration += QUARTER_SUBDIVISIONS;
          }
          else {
            currentNote && addCurrentNote();
            currentNote = {position: [x, decoding[0]], duration: parseFloat(decoding[1]) * QUARTER_SUBDIVISIONS};
          }
        }
        // Add the last note
        addCurrentNote();
        newGeneratedMelodies.push(generated);
      }
      // Save the response array
      setGeneratedMelodies(newGeneratedMelodies);
    };

    if (currNotes.length === 1) {
      //send data to init
      try {
        //first index of currNotes is the key and time signature
        const data = await fetch("/init", { method: "POST", body: JSON.stringify({ notes: currNotes[0] }) }).then(res => res.json());
        if (!data)
          throw "Failed to fetch data";
        } catch (error) {
        console.error("Error sending data:", error);
      }
    }
    // Generate notes
    try {
      const data = await fetch("/generate", { method: "POST", body: JSON.stringify({ notes: currNotes }) }).then(res => res.json()).catch(console.error);
      if (!data)
        throw "Failed to fetch data";
      setPredictedNotes(data);
    } catch (error) {
      console.error("Error sending data:", error);
    }
    setIsGenerating(false);
  };

  const getHoverMelodyOptionHandler = (i: number) => () => setHoveredMelody(i);
  const getHoverEndMelodyOptionHandler = (i: number) => () => i == hoveredMelody && setHoveredMelody(-1);
  const getSelectMelodyOptionHandler = (i: number) => () => selectedMelody == i ? setSelectedMelody(-1) : setSelectedMelody(i);
  const getApplyMelodyOptionHandler = (i: number) => () => {
    if (i < 0 || i >= generatedMelodies.length)
      return;
    notes.current = notes.current.concat(generatedMelodies[i]);
    setGeneratedMelodies([]);
    setSelectedMelody(-1);
    setHoveredMelody(-1);
  };

  useEffect(() => {
    if (backgroundRef.current)
      backgroundRef.current.onwheel = e => { e.preventDefault(); backgroundRef.current!.scrollLeft += e.deltaX ? e.deltaX : e.deltaY; };
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
    <EditorContext.Provider value={{gridMultiplier, quartersPerBar, EDITOR_WIDTH, verticalLinesPerQuarter, verticalLinesPerWhole, verticalLineBeatInterval, MAX_GRID_X}}>
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
          notes={notes.current}
          generatedMelodies={generatedMelodies}
          hoveredMelody={hoveredMelody}
          selectedMelody={selectedMelody}
          onTestNote={onTestNote}
          getUpdateNoteHandler={getUpdateNoteHandler}
        />
      </div>
      <div className="m-auto w-[80%]">
        <h1>Melody Options</h1>
        {
          generatedMelodies.length === 0 ? isGenerating ? <div>Generating...</div> : <div>Generate a melody first</div> :
          <div className="flex flex-row justify-center gap-x-4" style={{height: EDITOR_HEIGHT * scale + 8}}>
            {
              generatedMelodies.map((melody, i) => 
                <MelodyOption key={i} melody={melody} optionIndex={i + 1} selected={i == selectedMelody} onHover={getHoverMelodyOptionHandler(i)} onHoverEnd={getHoverEndMelodyOptionHandler(i)} onSelect={getSelectMelodyOptionHandler(i)} onApply={getApplyMelodyOptionHandler(i)} />
              )
            }
          </div>
        }
      </div>
      <div className="m-auto w-[80%]">
        <h1>Generation Options</h1>
        <div className="grid gap-y-4">
          <div className="flex flex-row gap-x-4 justify-center items-center">
            <div className="text-lg">{measureCount} measures</div>
            <Button
              onClick={onAddMeasure}
            >
              Add Measure
            </Button>
            <Button
              onClick={onRemoveMeasure}
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
            <label htmlFor="minor">Minor</label>
            <input type="checkbox" checked={isMinor} onChange={e => setIsMinor(e.target.checked)} />
          </div>
        </div>
      </div>
      <div className="h-32" />
      <div className="fixed bottom-0 py-3  overflow-hidden w-full background-2">
        <div className="flex flex-row gap-x-4 justify-center items-center ">
          <Button onClick={onAddNote}>Add Note</Button>
          <Button onClick={onAddRest}>Add Rest</Button>
          <Button onClick={onRemoveNote}>Remove Last Note</Button>
          <Button onClick={onClear} className={tryingToClear ? "!bg-red-400 hover:!bg-red-500 active:!bg-red-600" : ""}>{tryingToClear ? "Sure?" : "Clear"}</Button>
          <Button onClick={onLogNotes}>Log Notes</Button>
          <Button onClick={onPlayNotes}>Play Notes</Button>
          <Button onClick={onStopNotes}>Stop</Button>
          <Button onClick={onPredNotes}>{isGenerating ? "Generating..." : "Generate"}</Button>
        </div>
      </div>
    </EditorContext.Provider>
  );
}
