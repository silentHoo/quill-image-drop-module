var Delta = Quill.import("delta");

/**
 * Custom module for quilljs to allow user to drag images from their file system into the editor
 * and paste images from clipboard (Works on Chrome, Firefox, Edge, not on Safari)
 * @see https://quilljs.com/blog/building-a-custom-module/
 */
export class ImageDrop {
  /**
   * Instantiate the module given a quill instance and any options
   * @param {Quill} quill
   * @param {Object} options
   */
  constructor(quill, options = {}) {
    // save the quill reference
    this.quill = quill;
    this.options = options;
    // bind handlers to this instance
    this.handleDrop = this.handleDrop.bind(this);
    this.handlePaste = this.handlePaste.bind(this);
    // listen for drop and paste events
    this.quill.root.addEventListener("drop", this.handleDrop, false);
    this.quill.root.addEventListener("paste", this.handlePaste, false);
    // do not handle base64 images
    quill.clipboard.addMatcher('img[src^="data:image"]', () => new Delta());
  }

  /**
   * Handler for drop event to read dropped files from evt.dataTransfer
   * @param {Event} evt
   */
  handleDrop(evt) {
    if (
      evt.dataTransfer &&
      evt.dataTransfer.files &&
      evt.dataTransfer.files.length
    ) {
      if (document.caretRangeFromPoint) {
        const selection = document.getSelection();
        const range = document.caretRangeFromPoint(evt.clientX, evt.clientY);
        if (selection && range) {
          selection.setBaseAndExtent(
            range.startContainer,
            range.startOffset,
            range.startContainer,
            range.startOffset
          );
        }
      }
      this.readFiles(evt.dataTransfer.files, this.insert.bind(this), evt);
    }
  }

  /**
   * Handler for paste event to read pasted files from evt.clipboardData
   * @param {Event} evt
   */
  handlePaste(evt) {
    if (
      evt.clipboardData &&
      evt.clipboardData.items &&
      evt.clipboardData.items.length
    ) {
      this.readFiles(
        evt.clipboardData.items,
        (dataUrl) => {
          setTimeout(() => this.insert(dataUrl), 0);
        },
        evt
      );
    }
  }

  /**
   * Insert the image into the document at the current cursor position
   * @param {String} dataUrl  The base64-encoded image URI
   */
  insert(dataUrl) {
    const index =
      (this.quill.getSelection() || {}).index || this.quill.getLength();
    this.quill.insertEmbed(index, "image", dataUrl, "user");
  }

  /**
   * Extract image URIs a list of files from evt.dataTransfer or evt.clipboardData
   * @param {File[]} files  One or more File objects
   * @param {Function} callback  A function to send each data URI to
   */
  readFiles(files, callback, eventToStopIfImageDropOrPasteEvent) {
    // check each file for an image
    [].forEach.call(files, (file) => {
      if (
        !file.type.match(
          /^image\/(gif|jpe?g|a?png|svg|webp|bmp|vnd\.microsoft\.icon)/i
        )
      ) {
        // file is not an image
        // Note that some file formats such as psd start with image/* but are not readable
        return;
      }

      eventToStopIfImageDropOrPasteEvent.preventDefault();

      // read the clipboard item or file
      const blob = file.getAsFile ? file.getAsFile() : file;
      if (blob instanceof Blob) {
        if (this.options && this.options.urlHook) {
          this.options.urlHook(blob, callback);
        } else {
          // set up file reader
          const reader = new FileReader();
          reader.onload = (evt) => {
            callback(evt.target.result);
          };
          reader.readAsDataURL(blob);
        }
      }
    });
  }
}
