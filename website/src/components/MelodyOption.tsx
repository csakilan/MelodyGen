import { twMerge } from "tailwind-merge";
import { EDITOR_HEIGHT, NoteInfo } from "./Editor"
import Note from "./Note";
import { GRID_SIZE_X, QUARTER_SUBDIVISIONS } from "@/util/config";

interface MelodyOptionProps {
  melody: NoteInfo[];
  optionIndex: number;
  selected: boolean;
  onHover: () => void;
  onHoverEnd: () => void;
  onSelect: () => void;
  onApply: () => void;
}

export const scale = 1 / 4;
const minWidthMeasures = 4, maxWidthMeasures = 8;

export default function MelodyOption({ melody, optionIndex, selected, onHover, onHoverEnd, onSelect, onApply }: MelodyOptionProps) {
  const firstNoteX = melody[0].position[0];
  const insertPos = melody[melody.length - 1].position[0] + melody[melody.length - 1].duration - firstNoteX;
  const onTryApply = (e: React.MouseEvent) => {
    if (!selected)
      return;
    // prevent clicking on "Lock" from deselecting this option
    e.stopPropagation();
    onApply();
  };

  return (
    <div className={twMerge("relative box-border overflow-x-auto border-solid transition-all background-2", selected ? "border-4 rounded-lg border-cyan-400" : "border-2 rounded-md border-black")} style={{ maxWidth: maxWidthMeasures * GRID_SIZE_X * QUARTER_SUBDIVISIONS * 4 * scale }}>
      <div className="relative w-full h-full" style={{ width: insertPos * GRID_SIZE_X * scale, height: EDITOR_HEIGHT * scale, minWidth: minWidthMeasures * GRID_SIZE_X * QUARTER_SUBDIVISIONS * 4 * scale }}>
        {
          melody.map(note => { return { position: [note.position[0] - firstNoteX, note.position[1]], duration: note.duration } }).map((note: NoteInfo, i) => (
            <Note key={i} info={note} lastNote={i === melody.length - 1} updateNote={() => { }} draggable={false} scale={scale} optionIndex={optionIndex} />
          ))
        }
      </div>
      <div className="absolute w-full h-full hover:bg-[rgba(0,0,0,.1)] left-0 top-0 opacity-0 hover:opacity-100 transition-opacity duration-50 flex flex-col justify-center items-center" onMouseEnter={onHover} onMouseLeave={onHoverEnd} onMouseDown={onSelect}>
        <button className={twMerge("rounded-full bg-blue-600 border-1 border-solid border-blue-700 text-white px-2.5 py-1.5 transition-opacity text-sm", selected ? "opacity-100" : "opacity-0")} onMouseDown={onTryApply}>Apply</button>
      </div>
    </div>
  )
}