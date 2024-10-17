"use client";

import { useRef } from "react";
import Draggable from "react-draggable";

const EDITOR_WIDTH = 960, EDITOR_HEIGHT = 540;

export default function Editor() {
  const nodeRef = useRef(null);

  return (
    <div className={`m-auto relative p-2 overflow-hidden w-[${EDITOR_WIDTH}px] h-[${EDITOR_HEIGHT}px] border-4 border-black border-solid rounded-xl`}>
      <div className="relative w-0 h-0 m-auto">
        <div className="absolute m-auto grid border-2 border-solid border-black">
          supposed to be a grid
        </div>
      </div>
      <Draggable nodeRef={nodeRef} axis="both" allowAnyClick bounds="parent" defaultPosition={{x: EDITOR_WIDTH / 2, y: EDITOR_HEIGHT / 2}}>
        <div ref={nodeRef} className="draggable-note bg-[#555] w-fit">
          <h1>Melody Gen</h1>
          <div>
            Cool website I guess
          </div>
        </div>
      </Draggable>
    </div>
  );
}