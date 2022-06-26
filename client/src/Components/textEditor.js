import { useCallback, useEffect, useState } from "react";
import Quill from "quill";
import "quill/dist/quill.snow.css";
import { io } from "socket.io-client";
import { useParams } from "react-router-dom";

// time interval after document auto saves
const SAVE_INTERVAL_MS = 2000;

// toolbar customization for quill js
const TOOLBAR_OPTIONS = [
    [{ header: [1, 2, 3, 4, 5, 6, false] }],
    [{ font: [] }],
    [{ list: "ordered" }, { list: "bullet" }],
    ["bold", "italic", "underline"],
    [{ color: [] }, { background: [] }],
    [{ script: "sub" }, { script: "super" }],
    [{ align: [] }],
    ["image", "blockquote", "code-block"],
    ["clean"],
];

export default function TextEditor() {
    const { id: documentId } = useParams();
    const [socket, setSocket] = useState();
    const [quill, setQuill] = useState();

    // called only once to connect to socket instance
    useEffect(() => {
        const s = io("http://localhost:3001");
        setSocket(s);
        return () => {
            s.disconnect();
        };
    }, []);

    // called to load the document from the database if it exists or create a new one
    useEffect(() => {
        if (socket == null || quill == null) return;

        socket.once("load-document", (document) => {
            quill.setContents(document);
            quill.enable();
        });

        socket.emit("get-document", documentId);
    }, [socket, quill, documentId]);

    // called to save the document automatically after SAVE_INTERVAL_MS milliseconds
    useEffect(() => {
        if (socket == null || quill == null) return;

        const interval = setInterval(() => {
            socket.emit("save-document", quill.getContents());
        }, SAVE_INTERVAL_MS);

        return () => {
            clearInterval(interval);
        };
    }, [socket, quill]);

    // called to enable receiving changes in the document happening from other instances of the document
    useEffect(() => {
        if (socket == null || quill == null) return;
        const handler = (delta) => {
            quill.updateContents(delta);
        };
        socket.on("receive-changes", handler);
        return () => {
            socket.off("receive-changes", handler);
        };
    }, [socket, quill]);

    // called to send the changes made by the user in the current instance of the document to be reflected elsewhere
    useEffect(() => {
        if (socket == null || quill == null) return;
        const handler = (delta, oldDelta, source) => {
            if (source !== "user") return;
            socket.emit("send-changes", delta);
        };
        quill.on("text-change", handler);
        return () => {
            quill.off("text-change", handler);
        };
    }, [socket, quill]);

    // called to init quill editor
    const wrapperRef = useCallback((wrapper) => {
        if (wrapper == null) return;

        wrapper.innerHTML = "";
        const editor = document.createElement("div");
        wrapper.append(editor);
        const q = new Quill(editor, {
            theme: "snow",
            modules: { toolbar: TOOLBAR_OPTIONS },
        });
        setQuill(q);
        q.disable();
        q.setText("Loading...");
    }, []);

    return <div className="container" ref={wrapperRef}></div>;
}
