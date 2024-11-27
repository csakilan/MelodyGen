import { GRID_SIZE_X, GRID_SIZE_Y } from "@/util/config";
import { useContext, useRef, useState } from "react";
import Draggable, { DraggableEvent } from "react-draggable";
import { EDITOR_HEIGHT, EditorContext, GeneratedMelodyColors, GeneratedMelodyColorsDesaturated, noteIdToPosition, NoteInfo, notePositionToId } from "./Editor";
import { twMerge } from "tailwind-merge";

interface NoteProps {
    info: NoteInfo;
    lastNote: boolean;
    updateNote: (note: NoteInfo) => void;
    optionIndex?: number;
    draggable?: boolean;
    scale?: number;
    saturated?: boolean;
    hide?: boolean;
    editorRef?: React.MutableRefObject<HTMLDivElement | null>;
}

export default function Note({ info: { position, duration }, lastNote, updateNote, optionIndex = 0, editorRef, draggable = true, scale = 1, saturated = true, hide = false }: NoteProps) {
    const { gridMultiplier, EDITOR_WIDTH } = useContext(EditorContext);
    const nodeRef = useRef(null);
    const nodeRefEnd = useRef(null);
    const noteStartRef = useRef([0, 0]);
    const dragStartRef = useRef([0, 0]);
    const noteDurationStartRef = useRef(0);
    const [notePosition, setNotePosition] = useState(noteIdToPosition(position));
    const [noteDuration, setNoteDuration] = useState(duration);
    const [resizing, setResizing] = useState(false);
    if (duration !== noteDuration && !resizing)
        setNoteDuration(duration);

    const durationGridded = noteDuration / gridMultiplier;
    const GRID_X = GRID_SIZE_X * gridMultiplier;

    const onStart = (e: DraggableEvent) => {
        e = e as MouseEvent;
        noteStartRef.current = notePosition;
        dragStartRef.current = [e.screenX, e.screenY];
    }
    const onDrag = (e: DraggableEvent) => {
        e = e as MouseEvent;
        // const rect = editorRef!.current!.getBoundingClientRect();
        // const newPos = [e.clientX - rect.x - 4, e.clientY - rect.y - 4]
        //     .map(x => Math.floor(x / GRID_SIZE_Y) * GRID_SIZE_Y + GRID_SIZE_Y);
        const newPos = [e.screenX - dragStartRef.current[0] + noteStartRef.current[0], e.screenY - dragStartRef.current[1] + noteStartRef.current[1]]
            .map(x => Math.round(x / GRID_SIZE_Y) * GRID_SIZE_Y);
        // newPos[0] = Math.max(0, Math.min(EDITOR_WIDTH - GRID_SIZE, newPos[0]));
        newPos[0] = noteStartRef.current[0];
        newPos[1] = Math.max(0, Math.min(EDITOR_HEIGHT - GRID_SIZE_Y, newPos[1]));
        setNotePosition(newPos);
    };
    const onStop = () => {
        updateNote({ position: notePositionToId(notePosition), duration: noteDuration });
    };
    const onEndStart = (e: DraggableEvent) => {
        e = e as MouseEvent;
        noteStartRef.current = notePosition;
        noteDurationStartRef.current = noteDuration;
        dragStartRef.current = [e.screenX, e.screenY];
        setResizing(true);
    };
    const onEndDrag = (e: DraggableEvent) => {
        e = e as MouseEvent;
        onDrag(e);
        // Calculate new duration based on mouse offset from drag starting position
        let newDuration = (e.screenX - dragStartRef.current[0]) / GRID_SIZE_X + noteDurationStartRef.current;
        // Bound the max duration to the right edge of the editor
        newDuration = Math.min(newDuration, (EDITOR_WIDTH - notePosition[0]) / GRID_SIZE_X);
        // Shortest note duration is 1 (sixteenth note)
        newDuration = Math.max(gridMultiplier, Math.round(newDuration / gridMultiplier) * gridMultiplier);
        setNoteDuration(newDuration);
    };
    const onEndStop = () => {
        updateNote({ position: notePositionToId(notePosition), duration: noteDuration });
        setResizing(false);
    };

    const pitch = notePositionToId(notePosition)[1];
    const color = saturated ? GeneratedMelodyColors[optionIndex] : GeneratedMelodyColorsDesaturated[optionIndex];

    return (
        <Draggable handle=".note-bg" defaultClassName="absolute" nodeRef={nodeRef} axis="y" bounds="parent" grid={[GRID_X * scale, GRID_SIZE_Y * scale]} position={{ x: notePosition[0] * scale, y: notePosition[1] * scale }} onStart={onStart} onDrag={onDrag} onStop={onStop} disabled={!draggable}>
            <div ref={nodeRef} className={twMerge("box-border flex flex-row transition-opacity duration-50", draggable ? resizing ? "cursor-ew-resize" : "cursor-move" : "")} style={{ width: GRID_X * durationGridded * scale, height: GRID_SIZE_Y * scale, opacity: hide ? 0 : 1 }}>
                <div className={twMerge("note-bg w-full h-full border-solid box-border transition-colors", pitch === 0 ? "border-white" : "border-black")} style={{ borderWidth: Math.floor(scale), backgroundColor: pitch === 0 ? (saturated ? "black" : "#444") : color }}></div>
                <div className="relative h-full w-0">
                    {
                        lastNote &&
                        <div className="absolute -left-1 h-full">
                            <Draggable disabled={!lastNote} nodeRef={nodeRefEnd} axis="x" bounds="parent" grid={[GRID_X, GRID_SIZE_Y]} onStart={onEndStart} onDrag={onEndDrag} onStop={onEndStop}>
                                <div ref={nodeRefEnd} className={twMerge("absolute w-2 h-full", draggable && "cursor-ew-resize")}></div>
                            </Draggable>
                        </div>
                    }
                </div>
            </div>
        </Draggable>
    );
}