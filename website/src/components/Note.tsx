import { BORDER_WIDTH, GRID_SIZE } from "@/util/config";
import { useRef, useState } from "react";
import Draggable, { DraggableEvent } from "react-draggable";
import { EDITOR_HEIGHT, EDITOR_WIDTH } from "./Editor";

interface NoteProps {
    position: number[];
    duration: number;
    updateNote: (pos: number[], duration: number) => void;
}

export default function Note({ position, duration, updateNote }: NoteProps) {
    const nodeRef = useRef(null);
    const noteStartRef = useRef([0, 0]);
    const dragStartRef = useRef([0, 0]);
    const [notePosition, setNotePosition] = useState(position);
    const [noteDuration, setNoteDuration] = useState(duration);
    
    const onStart = (e: DraggableEvent) => {
        e = e as MouseEvent;
        noteStartRef.current = notePosition;
        dragStartRef.current = [e.screenX, e.screenY];
    }
    const onDrag = (e: DraggableEvent) => {
        e = e as MouseEvent;
        const newPos = [e.screenX - dragStartRef.current[0] + noteStartRef.current[0], e.screenY - dragStartRef.current[1] + noteStartRef.current[1]]
            .map(x => Math.round(x / GRID_SIZE) * GRID_SIZE);
        newPos[0] = Math.max(0, Math.min(EDITOR_WIDTH - GRID_SIZE, newPos[0]));
        newPos[1] = Math.max(0, Math.min(EDITOR_HEIGHT - GRID_SIZE, newPos[1]));
        setNotePosition(newPos);
    };
    const onStop = (e: DraggableEvent) => {
        e = e as MouseEvent;
        updateNote(notePosition, noteDuration);
    };

    return (
        <Draggable defaultClassName="absolute" nodeRef={nodeRef} axis="both" bounds="parent" grid={[GRID_SIZE, GRID_SIZE]} position={{x: notePosition[0], y: notePosition[1]}} onStart={onStart} onDrag={onDrag} onStop={onStop}>
            <div ref={nodeRef} className="draggable-note box-border" style={{width: GRID_SIZE * noteDuration, height: GRID_SIZE}}>
                <div className="bg-[#fff] w-full h-full"></div>
            </div>
        </Draggable>
    );
}