import { GRID_SIZE_X, GRID_SIZE_Y } from "@/util/config";
import { useRef, useState } from "react";
import Draggable, { DraggableEvent } from "react-draggable";
import { EDITOR_HEIGHT, EDITOR_WIDTH, noteIdToPosition, notePositionToId } from "./Editor";

interface NoteProps {
    position: number[];
    duration: number;
    gridMultiplier: number;
    lastNote: boolean;
    updateNote: (pos: number[], duration: number) => void;
}

export default function Note({ position, duration, gridMultiplier, lastNote, updateNote }: NoteProps) {
    const nodeRef = useRef(null);
    const nodeRefEnd = useRef(null);
    const noteStartRef = useRef([0, 0]);
    const dragStartRef = useRef([0, 0]);
    const noteDurationStartRef = useRef(0);
    const [notePosition, setNotePosition] = useState(noteIdToPosition(position));
    const [noteDuration, setNoteDuration] = useState(duration);
    const [resizing, setResizing] = useState(false);

    const durationGridded = noteDuration / gridMultiplier;
    const GRID_X = GRID_SIZE_X * gridMultiplier;
    
    const onStart = (e: DraggableEvent) => {
        e = e as MouseEvent;
        noteStartRef.current = notePosition;
        dragStartRef.current = [e.screenX, e.screenY];
    }
    const onDrag = (e: DraggableEvent) => {
        e = e as MouseEvent;
        const newPos = [e.screenX - dragStartRef.current[0] + noteStartRef.current[0], e.screenY - dragStartRef.current[1] + noteStartRef.current[1]]
            .map(x => Math.round(x / GRID_SIZE_Y) * GRID_SIZE_Y);
        // newPos[0] = Math.max(0, Math.min(EDITOR_WIDTH - GRID_SIZE, newPos[0]));
        newPos[0] = noteStartRef.current[0];
        newPos[1] = Math.max(0, Math.min(EDITOR_HEIGHT - GRID_SIZE_Y, newPos[1]));
        setNotePosition(newPos);
    };
    const onStop = () => {
        updateNote(notePositionToId(notePosition), noteDuration);
    };
    const onEndStart = (e: DraggableEvent) => {
        e = e as MouseEvent;
        noteDurationStartRef.current = noteDuration;
        dragStartRef.current = [e.screenX, e.screenY];
        setResizing(true);
    };
    const onEndDrag = (e: DraggableEvent) => {
        e = e as MouseEvent;
        // Calculate new duration based on mouse offset from drag starting position
        let newDuration = (e.screenX - dragStartRef.current[0]) / GRID_SIZE_X + noteDurationStartRef.current;
        // Bound the max duration to the right edge of the editor
        newDuration = Math.min(newDuration, (EDITOR_WIDTH - notePosition[0]) / GRID_SIZE_X);
        // Shortest note duration is 1 (sixteenth note)
        newDuration = Math.max(gridMultiplier, Math.round(newDuration / gridMultiplier) * gridMultiplier);
        setNoteDuration(newDuration);
    };
    const onEndStop = () => {
        updateNote(notePositionToId(notePosition), noteDuration);
        setResizing(false);
    }

    return (
        <Draggable handle=".note-bg" defaultClassName="absolute" nodeRef={nodeRef} axis="y" bounds="parent" grid={[GRID_X, GRID_SIZE_Y]} position={{x: notePosition[0], y: notePosition[1]}} onStart={onStart} onDrag={onDrag} onStop={onStop}>
            <div ref={nodeRef} className={`box-border flex flex-row ${resizing ? "cursor-ew-resize" : "cursor-move"}`} style={{width: GRID_X * durationGridded, height: GRID_SIZE_Y}}>
                <div className="note-bg bg-white w-full h-full"></div>
                <div className="relative h-full w-0">
                    {
                        lastNote && 
                        <div className="absolute -left-1 h-full">
                            <Draggable disabled={!lastNote} nodeRef={nodeRefEnd} axis="x" bounds="parent" grid={[GRID_X, GRID_SIZE_Y]} onStart={onEndStart} onDrag={onEndDrag} onStop={onEndStop}>
                                <div ref={nodeRefEnd} className="absolute cursor-ew-resize w-2 h-full"></div>
                            </Draggable>
                        </div>
                    }
                </div>
            </div>
        </Draggable>
    );
}