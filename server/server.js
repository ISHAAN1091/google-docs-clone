const mongoose = require("mongoose");
const Document = require("./schema/documents");

mongoose.connect("mongodb://localhost/google-docs-clone");

// default text in newly created documents
const defaultValue = "";

const io = require("socket.io")(3001, {
    cors: {
        origin: "http://localhost:3000",
        methods: ["GET", "POST"],
    },
});

io.on("connection", (socket) => {
    socket.on("get-document", async (documentId) => {
        // finding or creating a document with the requested documentId
        const document = await findOrCreateDocument(documentId);
        socket.join(documentId);
        // Sending the loaded document
        socket.emit("load-document", document.data);

        // Receive the changes made in the document by the particular user and reflect them
        // in other instances of the document as well to make it real time
        socket.on("send-changes", (delta) => {
            // sending the newly made changes to other instances of this doc
            socket.broadcast.to(documentId).emit("receive-changes", delta);
        });

        // Updating and saving the new changes in the document
        socket.on("save-document", async (data) => {
            await Document.findByIdAndUpdate(documentId, { data });
        });
    });
});

// function to find the requested document with given id if it exists or create one if it doesn't.
async function findOrCreateDocument(id) {
    if (id == null) return;

    const document = await Document.findById(id);
    if (document) return document;
    return await Document.create({ _id: id, data: defaultValue });
}
