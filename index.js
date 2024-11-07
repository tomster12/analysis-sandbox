var Globals;
(function (Globals) {
})(Globals || (Globals = {}));
var Easing;
(function (Easing) {
    function easeOutQuad(t) {
        return 1 - (1 - t) * (1 - t);
    }
    Easing.easeOutQuad = easeOutQuad;
})(Easing || (Easing = {}));
var Util;
(function (Util) {
    /** Create an HTML element from a string using innerHTML of a div.*/
    function createHTMLElement(elementString) {
        const div = document.createElement("div");
        div.innerHTML = elementString;
        return div.firstElementChild;
    }
    Util.createHTMLElement = createHTMLElement;
    /** Assert a condition is true, otherwise throw an error with the given message. */
    function assert(condition, message) {
        if (!condition)
            throw new Error(message);
    }
    Util.assert = assert;
    /** Check if a value is string[][]. */
    function instanceOfString2D(value) {
        if (!(value instanceof Array))
            return false;
        for (let i = 0; i < value.length; i++) {
            if (!(value[i] instanceof Array))
                return false;
            for (let j = 0; j < value[i].length; j++) {
                if (!(typeof value[i][j] == "string"))
                    return false;
            }
        }
        return true;
    }
    Util.instanceOfString2D = instanceOfString2D;
    /** Compare 2 string[][] */
    function compareString2D(a, b) {
        if ((a == null) !== (b == null))
            return false;
        if (a.length != b.length)
            return false;
        for (let i = 0; i < a.length; i++) {
            if (a[i].length != b[i].length)
                return false;
            for (let j = 0; j < a[i].length; j++) {
                if (a[i][j] != b[i][j])
                    return false;
            }
        }
        return true;
    }
    Util.compareString2D = compareString2D;
    /** Convert a message into a consistent visual element. */
    function createMessageElement(message, num) {
        const parent = Util.createHTMLElement(`<div class="message">
                <div class="message-number">${num}</div>
                <div class="message-content"></div>
            </div>`);
        const content = parent.querySelector(".message-content");
        // Set font size based on longest letter
        let maxLength = 0;
        for (const letter of message) {
            maxLength = Math.max(maxLength, letter.length);
        }
        let size = 1 - (maxLength - 1) * 0.25;
        size = size < 0.2 ? 0.2 : size;
        content.style.fontSize = `${size}rem`;
        // Add each letter as a span
        for (const letter of message) {
            content.appendChild(Util.createHTMLElement(`<span>${letter}</span>`));
        }
        return parent;
    }
    Util.createMessageElement = createMessageElement;
    /** A simple event bus for passing events to listeners. */
    class EventBus {
        dictEventHandleFunc;
        dictHandleEvent;
        constructor() {
            this.dictEventHandleFunc = {};
            this.dictHandleEvent = new Map();
        }
        listen(listener, event, callback) {
            if (!this.dictEventHandleFunc[event])
                this.dictEventHandleFunc[event] = new Map();
            this.dictEventHandleFunc[event].set(listener, callback);
            if (!this.dictHandleEvent.has(listener))
                this.dictHandleEvent.set(listener, []);
            this.dictHandleEvent.get(listener).push(event);
        }
        unlisten(handle) {
            Util.assert(this.dictHandleEvent.has(handle), "Handle does not exist");
            for (const event of this.dictHandleEvent.get(handle))
                this.dictEventHandleFunc[event].delete(handle);
            this.dictHandleEvent.delete(handle);
        }
        emit(event, ...args) {
            if (this.dictEventHandleFunc[event] === undefined)
                return;
            for (const [listener, callback] of this.dictEventHandleFunc[event])
                callback(...args);
        }
    }
    Util.EventBus = EventBus;
    class PriorityEventBus {
        dictEventPriorityHandleFunc;
        dictEventPriorities;
        dictHandleEvent;
        constructor() {
            this.dictEventPriorityHandleFunc = {};
            this.dictEventPriorities = {};
            this.dictHandleEvent = new Map();
        }
        listen(listener, event, priority, callback) {
            if (!this.dictEventPriorityHandleFunc[event])
                this.dictEventPriorityHandleFunc[event] = {};
            if (!this.dictEventPriorityHandleFunc[event][priority])
                this.dictEventPriorityHandleFunc[event][priority] = new Map();
            this.dictEventPriorityHandleFunc[event][priority].set(listener, callback);
            if (!this.dictHandleEvent.has(listener))
                this.dictHandleEvent.set(listener, []);
            this.dictHandleEvent.get(listener).push({ event, priority });
            if (!this.dictEventPriorities[event])
                this.dictEventPriorities[event] = [];
            if (this.dictEventPriorities[event].indexOf(priority) == -1) {
                this.dictEventPriorities[event].push(priority);
                this.dictEventPriorities[event] = this.dictEventPriorities[event].sort((a, b) => b - a);
            }
        }
        unlisten(handle) {
            Util.assert(this.dictHandleEvent.has(handle), "Handle does not exist");
            for (const sub of this.dictHandleEvent.get(handle)) {
                this.dictEventPriorityHandleFunc[sub.event][sub.priority].delete(handle);
                if (this.dictEventPriorityHandleFunc[sub.event][sub.priority].size == 0) {
                    delete this.dictEventPriorityHandleFunc[sub.event][sub.priority];
                }
            }
            this.dictHandleEvent.delete(handle);
        }
        emit(event, ...args) {
            if (this.dictEventPriorityHandleFunc[event] === undefined)
                return;
            for (const priority of this.dictEventPriorities[event]) {
                for (const [listener, callback] of this.dictEventPriorityHandleFunc[event][priority]) {
                    if (callback(...args))
                        return;
                }
            }
        }
    }
    Util.PriorityEventBus = PriorityEventBus;
    /** A proxy to an HTML element which can be moved around and removed. */
    class ElementProxy {
        element;
        events;
        position;
        constructor(elementString) {
            this.element = Util.createHTMLElement(elementString);
            this.events = new Util.EventBus();
            this.position = { x: 0, y: 0 };
            this.setParent(Globals.contentContainer);
        }
        remove() {
            this.events.emit("remove", this);
            this.element.remove();
        }
        getPosition() {
            return this.position;
        }
        setPosition(worldX, worldY) {
            this.element.style.left = worldX + "px";
            this.element.style.top = worldY + "px";
            this.position = { x: worldX, y: worldY };
            this.events.emit("move", this.position);
        }
        setParent(parent) {
            parent.appendChild(this.element);
        }
        getHTMLElement() {
            return this.element;
        }
    }
    Util.ElementProxy = ElementProxy;
    /** Listens to mouse events on a background element and scrolls a target element. */
    class ElementScroller {
        elementMain;
        elementClick;
        isDragging;
        canDrag;
        scroll;
        initialMouse;
        initialScroll;
        constructor(elementMain, elementClick) {
            this.elementMain = elementMain;
            this.elementClick = elementClick;
            this.isDragging = false;
            this.canDrag = true;
            this.scroll = { x: 0, y: 0 };
            this.initialMouse = { x: 0, y: 0 };
            this.initialScroll = { x: 0, y: 0 };
            this.updateElement();
            this.elementClick.addEventListener("mousedown", (e) => this.onBackgroundMouseDown(e));
            this.elementClick.addEventListener("mousemove", (e) => this.onBackgroundMouseMove(e));
            document.addEventListener("mouseup", (e) => this.onDocumentMouseUp(e));
        }
        updateElement() {
            this.elementMain.scrollLeft = this.scroll.x;
            this.elementMain.scrollTop = this.scroll.y;
        }
        onBackgroundMouseDown(e) {
            if (!this.canDrag)
                return;
            this.isDragging = true;
            this.initialMouse.x = e.clientX;
            this.initialMouse.y = e.clientY;
            this.initialScroll.x = this.scroll.x;
            this.initialScroll.y = this.scroll.y;
            document.body.style.cursor = "grabbing";
            this.elementClick.style.cursor = "grabbing";
            return true;
        }
        onBackgroundMouseMove(e) {
            if (!this.isDragging)
                return;
            this.scroll.x = Math.max(0, this.initialScroll.x - (e.clientX - this.initialMouse.x));
            this.scroll.y = Math.max(0, this.initialScroll.y - (e.clientY - this.initialMouse.y));
            this.updateElement();
        }
        onDocumentMouseUp(e) {
            if (!this.isDragging)
                return;
            this.isDragging = false;
            document.body.style.cursor = "default";
            this.elementClick.style.cursor = "grab";
        }
        setCanDrag(isEnabled) {
            this.canDrag = isEnabled;
            this.elementClick.style.cursor = isEnabled ? "grab" : "default";
            if (!isEnabled) {
                this.isDragging = false;
                document.body.style.cursor = "default";
            }
        }
    }
    Util.ElementScroller = ElementScroller;
    /** Handles adding notifications to an element. */
    class NotificationManager {
        container;
        constructor(elementContainer) {
            this.container = elementContainer;
        }
        notify(message, position, type = "info") {
            const el = new Util.ElementProxy(`
                <div class="notification ${type}">
                    <div><img></img></div>
                    <span>${message}</span>
                </div>`);
            el.setPosition(position.x, position.y);
            el.setParent(this.container);
            setTimeout(() => {
                el.element.classList.add("closing");
                setTimeout(() => {
                    el.remove();
                }, 500);
            }, 1200);
        }
    }
    Util.NotificationManager = NotificationManager;
    /** A wrapper for an element which can be scrolled horizontally. */
    class ScrollableWrapper extends ElementProxy {
        elementContent;
        elementBar;
        elementThumb;
        constructor() {
            super(`<div class="scrollable-wrapper">
                    <div class="scrollable-wrapper-content"></div>
                    <div class="scrollable-wrapper-bar">
                        <div class="scrollable-wrapper-thumb"</div>
                    </div>
                </div>`);
            this.elementContent = this.element.querySelector(".scrollable-wrapper-content");
            this.elementBar = this.element.querySelector(".scrollable-wrapper-bar");
            this.elementThumb = this.element.querySelector(".scrollable-wrapper-thumb");
            // Setup event listeners
            this.elementContent.addEventListener("scroll", () => this.updateThumbToContent());
            this.elementContent.addEventListener("input", () => this.updateThumbToContent());
            this.elementContent.addEventListener("wheel", (e) => {
                e.preventDefault();
                this.elementContent.scrollLeft += e.deltaY;
            });
            window.addEventListener("resize", () => this.updateThumbToContent());
            window.addEventListener("load", () => this.updateThumbToContent());
            this.elementThumb.addEventListener("mousedown", (e) => this.onThumbMouseDown(e));
            // Setup mutation observer to update thumb on content change
            const mutationObserver = new MutationObserver(() => this.updateThumbToContent());
            mutationObserver.observe(this.elementContent, {
                childList: true,
                subtree: true,
                attributes: true,
                characterData: true, // Observe text content changes
            });
        }
        onThumbMouseDown(e) {
            e.preventDefault();
            this.elementThumb.classList.add("dragging");
            const startMouseX = e.clientX;
            const startThumbScroll = this.elementThumb.offsetLeft;
            const onMouseMove = (e) => {
                const deltaMouseX = e.clientX - startMouseX;
                const scrollLeftPct = (startThumbScroll + deltaMouseX) / (this.elementBar.clientWidth - this.elementThumb.clientWidth);
                this.elementContent.scrollLeft = scrollLeftPct * (this.elementContent.scrollWidth - this.elementContent.clientWidth);
            };
            const onMouseUp = () => {
                this.elementThumb.classList.remove("dragging");
                window.removeEventListener("mousemove", onMouseMove);
                window.removeEventListener("mouseup", onMouseUp);
            };
            window.addEventListener("mousemove", onMouseMove);
            window.addEventListener("mouseup", onMouseUp);
        }
        updateThumbToContent() {
            const clientSizeX = this.elementContent.clientWidth;
            const clientScrollableX = this.elementContent.scrollWidth;
            const clientScrollX = this.elementContent.scrollLeft;
            if (clientSizeX >= clientScrollableX) {
                this.elementThumb.style.display = "none";
                return;
            }
            this.elementThumb.style.display = "block";
            this.elementThumb.style.width = `${(clientSizeX / clientScrollableX) * 100}%`;
            this.elementThumb.style.left = `${(clientScrollX / clientScrollableX) * 100}%`;
        }
        addContent(content) {
            this.elementContent.appendChild(content);
        }
    }
    Util.ScrollableWrapper = ScrollableWrapper;
    class Dropdown extends ElementProxy {
        elementMain;
        elementCurrent;
        elementCurrentIcon;
        elementIconSelect;
        elementOptions;
        mode;
        options;
        isOpen;
        selected;
        constructor(options, initial, mode = "icon") {
            super(`
                <div class="dropdown">
                    <div class="dropdown-main">
                        <div class="dropdown-current"></div>
                        <img class="dropdown-icon-select" src="assets/icon-dropdown.png">
                    </div>
                    <div class="dropdown-options"></div>
                </div>`);
            this.elementMain = this.element.querySelector(".dropdown-main");
            this.elementCurrent = this.element.querySelector(".dropdown-current");
            this.elementIconSelect = this.element.querySelector(".dropdown-icon-select");
            this.elementOptions = this.element.querySelector(".dropdown-options");
            this.elementOptions.style.display = "none";
            this.mode = mode;
            this.isOpen = false;
            if (this.mode == "icon") {
                this.elementCurrentIcon = Util.createHTMLElement(`<img>`);
                this.elementCurrent.appendChild(this.elementCurrentIcon);
            }
            this.elementMain.addEventListener("click", (e) => {
                e.stopPropagation();
                this.setOpen(!this.isOpen);
            });
            window.addEventListener("click", () => {
                this.setOpen(false);
            });
            this.setOptions(options);
            this.selectOption(initial);
        }
        setOptions(options) {
            this.options = options;
            this.elementOptions.innerHTML = "";
            // If no options update class
            let noOptions = Object.keys(this.options).length == 0;
            this.element.classList.toggle("no-options", noOptions);
            this.elementIconSelect.src = noOptions ? "assets/icon-cross.png" : "assets/icon-dropdown.png";
            // Create option elements
            for (let option in this.options) {
                let optionElement = Util.createHTMLElement(`<div>`);
                this.elementOptions.appendChild(optionElement);
                // Mode based content
                if (this.mode == "icon") {
                    let imgElement = Util.createHTMLElement(`<img>`);
                    imgElement.src = this.options[option];
                    optionElement.appendChild(imgElement);
                }
                else {
                    optionElement.innerText = this.options[option];
                }
                // Add event listener
                optionElement.addEventListener("click", (e) => {
                    e.stopPropagation();
                    this.selectOption(option);
                });
            }
        }
        selectOption(option) {
            // If option is null deselect options
            if (option == null) {
                this.selected = "";
                this.elementCurrent.innerText = "None";
                this.setOpen(false);
                return;
            }
            // Set selected option and update icon
            this.selected = option;
            if (this.mode == "icon") {
                this.elementCurrentIcon.src = this.options[option];
            }
            else {
                this.elementCurrent.innerText = this.options[option];
            }
            this.events.emit("select", option);
            this.setOpen(false);
        }
        setOpen(open) {
            if (open == this.isOpen)
                return;
            if (open && Object.keys(this.options).length == 0)
                return;
            this.elementOptions.style.display = open ? "flex" : "none";
            this.element.classList.toggle("open", open);
            this.isOpen = open;
        }
    }
    Util.Dropdown = Dropdown;
    class Checkbox extends ElementProxy {
        elementCheckbox;
        isChecked;
        constructor(label, isChecked) {
            super(`
                <div class="checkbox">
                    <span>${label}</span>
                    <input type="checkbox">
                </div>`);
            this.elementCheckbox = this.element.querySelector("input");
            this.elementCheckbox.checked = isChecked;
            this.isChecked = isChecked;
            this.elementCheckbox.addEventListener("change", () => {
                this.isChecked = this.elementCheckbox.checked;
                this.events.emit("change", this.isChecked);
            });
        }
        override(checked) {
            this.elementCheckbox.checked = checked;
            this.isChecked = checked;
        }
    }
    Util.Checkbox = Checkbox;
})(Util || (Util = {}));
var Cipher;
(function (Cipher) {
    function parseMessage(text, delimeter = "") {
        return text.split(delimeter);
    }
    Cipher.parseMessage = parseMessage;
})(Cipher || (Cipher = {}));
var Panel;
(function (Panel_1) {
    function isCompatibleValueType(sourceType, targetType) {
        if (sourceType == targetType)
            return true;
        return false;
    }
    Panel_1.isCompatibleValueType = isCompatibleValueType;
    /** Utility class for panel. */
    class PanelNode {
        element;
        elementIndicator;
        elementLabel;
        constructor(element, elementIndicator, elementLabel) {
            this.element = element;
            this.elementIndicator = elementIndicator;
            this.elementLabel = elementLabel;
        }
        setLabel(label) {
            this.elementLabel.innerHTML = label;
        }
        setConnecting(connecting) {
            this.element.classList.toggle("connecting", connecting);
        }
        setInvalid(invalid) {
            this.element.classList.toggle("invalid", invalid);
        }
        getIndicatorRect() {
            return this.elementIndicator.getBoundingClientRect();
        }
    }
    Panel_1.PanelNode = PanelNode;
    /** Panel which can contain content and have input / output nodes. */
    class Panel extends Util.ElementProxy {
        elementBar;
        elementBarTitle;
        elementBarClose;
        elementContent;
        elementInputNodes;
        elementOutputNodes;
        content;
        nodes;
        isDragging;
        initialMouseX;
        initialMouseY;
        initialOffsetX;
        initialOffsetY;
        constructor(content, title) {
            super(`
                <div class="panel">
                    <div class="panel-bar">
                        <div class="panel-bar-title">${title}</div>
                        <img class="panel-bar-close"></img>
                    </div>
                    <div class="panel-body">
                        <div class="panel-nodes input"></div>
                        <div class="panel-content"></div>
                        <div class="panel-nodes output"></div>
                    </div>
                </div>`);
            this.elementBar = this.element.querySelector(".panel-bar");
            this.elementBarTitle = this.element.querySelector(".panel-bar-title");
            this.elementBarClose = this.element.querySelector(".panel-bar-close");
            this.elementContent = this.element.querySelector(".panel-content");
            this.elementInputNodes = this.element.querySelector(".panel-nodes.input");
            this.elementOutputNodes = this.element.querySelector(".panel-nodes.output");
            this.elementBar.addEventListener("mousedown", (e) => this.onBarMouseDown(e));
            this.elementBarClose.addEventListener("mousedown", (e) => this.onCloseMouseDown(e));
            document.addEventListener("mousemove", (e) => this.onMouseMove(e));
            document.addEventListener("mouseup", (e) => this.onMouseUp(e));
            this.nodes = { input: [], output: [] };
            this.isDragging = false;
            this.initialMouseX = 0;
            this.initialMouseY = 0;
            this.initialOffsetX = 0;
            this.initialOffsetY = 0;
            this.content = content;
            this.elementContent.appendChild(this.content.getHTMLElement());
            this.content.setPanel(this);
        }
        createNode(type, index) {
            const element = Util.createHTMLElement(`
                <div class="panel-node">
                    <div class="hover-box"></div>
                    <div class="indicator"></div>
                    <span class="label"></span>
                </div>`);
            const elementIndicator = element.querySelector(".indicator");
            const elementLabel = element.querySelector(".label");
            element.addEventListener("mouseenter", (e) => {
                e.stopPropagation();
                this.events.emit("nodeHovered", type, index);
            });
            element.addEventListener("mouseleave", (e) => {
                e.stopPropagation();
                this.events.emit("nodeUnhovered", type, index);
            });
            element.addEventListener("mousedown", (e) => {
                e.stopPropagation();
                this.events.emit("nodeClicked", type, index);
            });
            return new PanelNode(element, elementIndicator, elementLabel);
        }
        reinitializeNodes(inputCount, outputCount) {
            let updated = false;
            if (inputCount != this.nodes.input.length) {
                updated = true;
                this.elementInputNodes.innerHTML = "";
                this.nodes.input = [];
                for (let i = 0; i < inputCount; i++) {
                    const node = this.createNode("input", i);
                    this.elementInputNodes.appendChild(node.element);
                    this.nodes.input.push(node);
                }
            }
            if (outputCount != this.nodes.output.length) {
                updated = true;
                this.elementOutputNodes.innerHTML = "";
                this.nodes.output = [];
                for (let i = 0; i < outputCount; i++) {
                    const node = this.createNode("output", i);
                    this.elementOutputNodes.appendChild(node.element);
                    this.nodes.output.push(node);
                }
            }
            if (updated)
                this.events.emit("nodesUpdated");
        }
        setInput(index, value) {
            this.content.setInput(index, value);
        }
        getOutput(index) {
            return this.content.getOutput(index);
        }
        getNodeValueType(type, index) {
            return this.content.getNodeValueType(type, index);
        }
        onConnectionDisconnect(type, index) {
            this.content.onConnectionDisconnect(type, index);
        }
        onBarMouseDown(e) {
            this.isDragging = true;
            this.initialMouseX = e.clientX;
            this.initialMouseY = e.clientY;
            this.initialOffsetX = this.element.offsetLeft;
            this.initialOffsetY = this.element.offsetTop;
            document.body.style.cursor = "grabbing";
            this.elementBar.style.cursor = "grabbing";
        }
        onCloseMouseDown(e) {
            this.remove();
        }
        onMouseMove(e) {
            if (!this.isDragging)
                return;
            const deltaX = e.clientX - this.initialMouseX;
            const deltaY = e.clientY - this.initialMouseY;
            this.setPosition(this.initialOffsetX + deltaX, this.initialOffsetY + deltaY);
        }
        onMouseUp(e) {
            if (!this.isDragging)
                return;
            this.isDragging = false;
            document.body.style.cursor = "default";
            this.elementBar.style.cursor = "grab";
        }
        serialize() {
            return this.content.serialize();
        }
        deserialize(data) {
            this.content.deserialize(data);
        }
    }
    Panel_1.Panel = Panel;
    /** Visual and representation of a connection between two panels. */
    class PanelConnection {
        element;
        isConnected;
        sourcePanel;
        targetPanel;
        sourceIndex;
        targetIndex;
        sourceWorldPos;
        targetWorldPos;
        constructor() {
            this.element = document.createElementNS("http://www.w3.org/2000/svg", "path");
            Globals.svgContainer.appendChild(this.element);
            this.isConnected = false;
        }
        setSource(panel, index) {
            Util.assert(!this.isConnected, "Connection is already connected");
            this.sourcePanel = panel;
            this.sourceIndex = index;
            this.sourcePanel.events.listen(this, "move", () => this.onSourceNodesUpdated());
            this.sourcePanel.events.listen(this, "nodesUpdated", () => this.onSourceNodesUpdated());
            this.sourcePanel.events.listen(this, "remove", () => this.remove());
            this.sourcePanel.nodes.output[this.sourceIndex].setConnecting(true);
            if (this.targetPanel)
                this.establish();
            this.recalculateSourcePos();
            if (!this.targetWorldPos)
                this.targetWorldPos = this.sourceWorldPos;
            if (!this.isConnected)
                document.body.style.cursor = "pointer";
            this.updateElement();
        }
        setTarget(panel, index) {
            Util.assert(!this.isConnected, "Connection is already connected");
            this.targetPanel = panel;
            this.targetIndex = index;
            this.targetPanel.events.listen(this, "move", () => this.onTargetNodesUpdated());
            this.targetPanel.events.listen(this, "nodesUpdated", () => this.onTargetNodesUpdated());
            this.targetPanel.events.listen(this, "remove", () => this.remove());
            this.targetPanel.nodes.input[this.targetIndex].setConnecting(true);
            if (this.sourcePanel)
                this.establish();
            this.recalculateTargetPos();
            if (!this.sourceWorldPos)
                this.sourceWorldPos = this.targetWorldPos;
            if (!this.isConnected)
                document.body.style.cursor = "pointer";
            this.updateElement();
        }
        canConnectWith(panel, type, index) {
            // Dont allow if any of the following:
            // - Panel -> self
            // - Input -> input OR output -> output
            // - Incompatible types (directional)
            if (this.isConnected)
                return false;
            if (panel == this.sourcePanel || panel == this.targetPanel)
                return false;
            if (this.sourcePanel != null && type == "output")
                return false;
            if (this.targetPanel != null && type == "input")
                return false;
            if (panel.nodes[type].length <= index)
                return false;
            if (this.sourcePanel != null)
                return isCompatibleValueType(this.sourcePanel.getNodeValueType("output", this.sourceIndex), panel.getNodeValueType(type, index));
            if (this.targetPanel != null)
                return isCompatibleValueType(panel.getNodeValueType(type, index), this.targetPanel.getNodeValueType("input", this.targetIndex));
            return false;
        }
        set(sourcePanel, sourceindex, targetPanel, targetindex) {
            Util.assert(!this.isConnected, "Connection is already connected");
            this.sourcePanel = sourcePanel;
            this.sourceIndex = sourceindex;
            this.targetPanel = targetPanel;
            this.targetIndex = targetindex;
            this.sourcePanel.events.listen(this, "move", () => this.onSourceNodesUpdated());
            this.sourcePanel.events.listen(this, "nodesUpdated", () => this.onSourceNodesUpdated());
            this.sourcePanel.events.listen(this, "remove", () => this.remove());
            this.targetPanel.events.listen(this, "move", () => this.onTargetNodesUpdated());
            this.targetPanel.events.listen(this, "nodesUpdated", () => this.onTargetNodesUpdated());
            this.targetPanel.events.listen(this, "remove", () => this.remove());
            this.recalculateSourcePos();
            this.recalculateTargetPos();
            this.establish();
            this.updateElement();
        }
        remove() {
            document.body.style.cursor = "default";
            if (this.sourcePanel) {
                this.sourcePanel.events.unlisten(this);
                if (this.sourceIndex < this.sourcePanel.nodes.output.length) {
                    this.sourcePanel.nodes.output[this.sourceIndex].setConnecting(false);
                    this.sourcePanel.onConnectionDisconnect("output", this.sourceIndex);
                }
            }
            if (this.targetPanel) {
                this.targetPanel.events.unlisten(this);
                if (this.targetIndex < this.targetPanel.nodes.input.length) {
                    this.targetPanel.nodes.input[this.targetIndex].setConnecting(false);
                    this.targetPanel.onConnectionDisconnect("input", this.targetIndex);
                }
            }
            this.element.remove();
            Globals.worldManager.onConnectionRemoved(this);
        }
        unsetSource() {
            Util.assert(this.isConnected, "Connection is not connected");
            this.isConnected = false;
            document.body.style.cursor = "pointer";
            this.targetPanel.onConnectionDisconnect("output", this.sourceIndex);
            this.targetPanel.nodes.input[this.targetIndex].setConnecting(true);
            this.sourcePanel.events.unlisten(this);
            this.sourcePanel = null;
            this.sourceIndex = -1;
            this.updateElement();
        }
        unsetTarget() {
            Util.assert(this.isConnected, "Connection is not connected");
            this.isConnected = false;
            document.body.style.cursor = "pointer";
            this.sourcePanel.nodes.output[this.sourceIndex].setConnecting(true);
            this.targetPanel.onConnectionDisconnect("input", this.targetIndex);
            this.targetPanel.events.unlisten(this);
            this.targetPanel = null;
            this.targetIndex = -1;
            this.updateElement();
        }
        recalculateSourcePos() {
            if (!this.sourcePanel)
                return;
            const sourceScreenRect = this.sourcePanel.nodes.output[this.sourceIndex].getIndicatorRect();
            this.sourceWorldPos = {
                x: sourceScreenRect.left + sourceScreenRect.width / 2 + Globals.scroller.scroll.x,
                y: sourceScreenRect.top + sourceScreenRect.height / 2 + Globals.scroller.scroll.y,
            };
        }
        recalculateTargetPos() {
            if (!this.targetPanel)
                return;
            const targetScreenRect = this.targetPanel.nodes.input[this.targetIndex].getIndicatorRect();
            this.targetWorldPos = {
                x: targetScreenRect.left + targetScreenRect.width / 2 + Globals.scroller.scroll.x,
                y: targetScreenRect.top + targetScreenRect.height / 2 + Globals.scroller.scroll.y,
            };
        }
        establish() {
            this.isConnected = true;
            document.body.style.cursor = "default";
            this.sourcePanel.nodes.output[this.sourceIndex].setConnecting(false);
            this.targetPanel.nodes.input[this.targetIndex].setConnecting(false);
            this.sourcePanel.events.listen(this, "outputUpdated", (index, value) => {
                if (index === this.sourceIndex)
                    this.targetPanel.setInput(this.targetIndex, value);
            });
            const value = this.sourcePanel.getOutput(this.sourceIndex);
            this.targetPanel.setInput(this.targetIndex, value);
        }
        updateElement() {
            const dx = this.targetWorldPos.x - this.sourceWorldPos.x;
            const dy = this.targetWorldPos.y - this.sourceWorldPos.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            // Interpolate from 0 -> 60 with distance 40 -> 100
            const controlOffsetT = Math.min(1, Math.max(0, (dist - 30) / (120 - 30)));
            const controlOffset = Easing.easeOutQuad(controlOffsetT) * 60;
            const p1X = this.sourceWorldPos.x;
            const p1Y = this.sourceWorldPos.y;
            const p2X = this.targetWorldPos.x;
            const p2Y = this.targetWorldPos.y;
            const c1X = p1X + controlOffset;
            const c1Y = p1Y;
            const c2X = p2X - controlOffset;
            const c2Y = p2Y;
            const d = `M ${p1X} ${p1Y} C ${c1X} ${c1Y}, ${c2X} ${c2Y}, ${p2X} ${p2Y}`;
            this.element.setAttribute("d", d);
            this.element.setAttribute("stroke", "#d7d7d7");
            this.element.setAttribute("stroke-width", "3");
            this.element.setAttribute("fill", "none");
        }
        onSourceNodesUpdated() {
            // Check source index is still within range
            if (this.sourceIndex >= this.sourcePanel.nodes.output.length) {
                this.remove();
                return;
            }
            this.recalculateSourcePos();
            this.updateElement();
        }
        onTargetNodesUpdated() {
            // Check target index is still within range
            if (this.targetIndex >= this.targetPanel.nodes.input.length) {
                Globals.notificationManager.notify("Target node removed", this.targetWorldPos, "warning");
                this.remove();
                return;
            }
            this.recalculateTargetPos();
            this.updateElement();
        }
        setForcedWorldPosition(worldX, worldY) {
            // Stop caring about the set position once already connected
            if (this.isConnected)
                throw new Error("Cannot set target position of connected connection");
            if (!this.sourcePanel)
                this.sourceWorldPos = { x: worldX, y: worldY };
            else
                this.recalculateSourcePos();
            if (!this.targetPanel)
                this.targetWorldPos = { x: worldX, y: worldY };
            else
                this.recalculateTargetPos();
            this.updateElement();
        }
    }
    Panel_1.PanelConnection = PanelConnection;
    /** Panel content, takes user input. */
    class UserInputContent extends Util.ElementProxy {
        panel;
        elementMessagesContainer;
        elementMessagesList;
        messagesScrollable;
        elementAddMessage;
        elementDelim;
        elementMessages;
        inputMessages;
        outputMessages;
        constructor() {
            super(`<div class="user-input-panel-content">
                    <div class="user-input-messages-container"></div>
                    <div class="user-input-options">
                        <div class="user-input-add-message">+</div>
                        <p>Delimeter</p>
                        <input class="user-input-delim" contentEditable="true"></input>
                    </div>
                </div>`);
            this.elementMessagesContainer = this.element.querySelector(".user-input-messages-container");
            this.elementAddMessage = this.element.querySelector(".user-input-add-message");
            this.elementDelim = this.element.querySelector(".user-input-delim");
            this.elementMessages = [];
            this.inputMessages = [];
            this.outputMessages = [];
            this.messagesScrollable = new Util.ScrollableWrapper();
            this.elementMessagesList = Util.createHTMLElement(`<div class="user-input-messages-list"></div>`);
            this.elementMessagesContainer.prepend(this.messagesScrollable.element);
            this.messagesScrollable.addContent(this.elementMessagesList);
            this.elementAddMessage.addEventListener("click", () => this.addMessage());
            this.elementDelim.addEventListener("input", (e) => this.onDelimChanged(e));
            this.addMessage();
        }
        addMessage() {
            const index = this.elementMessages.length;
            const elementMessage = Util.createHTMLElement(`
                <div class="user-input-message">
                    <div class="user-input-message-remove"><img></img></div>
                    <div class="message-number">${index + 1}</div>
                    <div class="user-input-message-input" contentEditable="true"></div>
                </div>`);
            const elementMessageInput = elementMessage.querySelector(".user-input-message-input");
            const elementMessageRemove = elementMessage.querySelector(".user-input-message-remove");
            this.elementMessagesList.appendChild(elementMessage);
            this.elementMessages.push({ message: elementMessage, input: elementMessageInput });
            elementMessageInput.addEventListener("input", () => this.onMessageInputChanged(elementMessageInput));
            elementMessageInput.addEventListener("keypress", (e) => this.onMessageKeyPressed(e, elementMessageInput));
            elementMessageRemove.addEventListener("click", () => this.deleteMessage(elementMessageInput));
            if (this.panel)
                this.updateOutput();
        }
        deleteMessage(input) {
            const index = this.elementMessages.findIndex((m) => m.input == input);
            this.elementMessages[index].message.remove();
            this.elementMessages.splice(index, 1);
            this.elementMessages.forEach((m, i) => (m.message.querySelector(".message-number").textContent = (i + 1).toString()));
            this.updateOutput();
        }
        updateOutput() {
            this.inputMessages = this.elementMessages.map((m) => m.input.innerText);
            this.outputMessages = this.inputMessages.map((m) => Cipher.parseMessage(m, this.elementDelim.value));
            this.panel.events.emit("nodesUpdated");
            this.panel.events.emit("outputUpdated", 0, this.getOutput(0));
        }
        setPanel(panel) {
            this.panel = panel;
            this.panel.reinitializeNodes(0, 1);
            this.panel.nodes.output[0].setLabel(this.getNodeValueType("output", 0));
            this.updateOutput();
        }
        setInput(_index, _value) {
            Util.assert(false, "TextEntity does not have any inputs");
        }
        overrideMessages(messages) {
            while (this.elementMessages.length > 0)
                this.deleteMessage(this.elementMessages[0].input);
            messages.forEach(() => this.addMessage());
            this.elementMessages.forEach((m, i) => (m.input.textContent = messages[i]));
            this.updateOutput();
            // NOTE: Message scroll widths are incorrect at this point
            // Even with multiple requestAnimationFrame calls it is still incorrect
            // this.elementMessagesList.offsetWidth is wrong here :(
            this.messagesScrollable.updateThumbToContent();
        }
        getOutput(index) {
            Util.assert(index == 0, "TextEntity only has one output");
            return this.outputMessages;
        }
        getNodeValueType(type, index) {
            if (type == "output" && index == 0)
                return "string[][]";
            Util.assert(false, `Cannot get type of ${type} node at index ${index} on HardcodedEntity`);
        }
        onMessageKeyPressed(e, input) { }
        onMessageInputChanged(input) {
            // Clean up remaining elements after clearing out div
            if (input.textContent == "\n" || input.textContent == "")
                input.innerHTML = "";
            this.updateOutput();
        }
        onDelimChanged(e) {
            this.updateOutput();
        }
        onConnectionDisconnect(type, index) { }
        serialize() {
            return {
                type: "User Input",
                position: this.panel.position,
                inputMessages: this.inputMessages,
                delim: this.elementDelim.value,
            };
        }
        deserialize(data) {
            this.panel.setPosition(data.position.x, data.position.y);
            this.elementDelim.value = data.delim;
            this.overrideMessages(data.inputMessages);
        }
    }
    Panel_1.UserInputContent = UserInputContent;
    /** Panel content, previews messages. */
    class PreviewPanelContent extends Util.ElementProxy {
        panel;
        messagesScrollable;
        elementMessages;
        messages;
        constructor() {
            super(`<div class="preview-panel-content"></div>`);
            this.messagesScrollable = new Util.ScrollableWrapper();
            this.elementMessages = Util.createHTMLElement(`<div class="messages"></div>`);
            this.messagesScrollable.addContent(this.elementMessages);
            this.element.appendChild(this.messagesScrollable.getHTMLElement());
            this.messages = [];
        }
        setPanel(panel) {
            this.panel = panel;
            this.panel.reinitializeNodes(1, 1);
            this.panel.nodes.input[0].setLabel(this.getNodeValueType("input", 0));
            this.panel.nodes.output[0].setLabel(this.getNodeValueType("output", 0));
        }
        setInput(index, value) {
            Util.assert(index == 0, "TextEntity only has one input");
            if (!Util.instanceOfString2D(value)) {
                const position = this.panel.nodes.input[index].getIndicatorRect();
                Globals.notificationManager.notify("Bad input type!", { x: position.left - 50, y: position.top - 35 }, "error");
                console.error(value);
                return;
            }
            if (Util.compareString2D(this.messages, value))
                return;
            this.messages = value;
            this.elementMessages.innerHTML = "";
            for (let i = 0; i < this.messages.length; i++) {
                this.elementMessages.appendChild(Util.createMessageElement(this.messages[i], i + 1));
            }
            this.elementMessages.classList.toggle("empty", this.messages.length === 0);
            this.panel.events.emit("nodesUpdated");
            this.panel.events.emit("outputUpdated", 0, this.getOutput(0));
        }
        getOutput(index) {
            Util.assert(index == 0, "TextEntity only has one output");
            return this.messages;
        }
        getNodeValueType(type, index) {
            if (type == "input" && index == 0)
                return "string[][]";
            if (type == "output" && index == 0)
                return "string[][]";
            Util.assert(false, `Cannot get type of ${type} node at index ${index} on PreviewMessagesEntity`);
        }
        onConnectionDisconnect(type, index) {
            if (type == "input")
                this.setInput(0, []);
        }
        serialize() {
            return {
                type: "Preview",
                position: this.panel.position,
            };
        }
        deserialize(data) {
            this.panel.setPosition(data.position.x, data.position.y);
        }
    }
    Panel_1.PreviewPanelContent = PreviewPanelContent;
    /** Panel content, splits messages into lines. */
    class SplitPanelContent extends Util.ElementProxy {
        elementCount;
        panel;
        messages;
        constructor() {
            super(`<div class="split-panel-content"><p>0</p></div>`);
            this.elementCount = this.element.querySelector("p");
        }
        setPanel(panel) {
            this.panel = panel;
            this.panel.reinitializeNodes(1, 0);
            this.panel.nodes.input[0].setLabel(this.getNodeValueType("input", 0));
        }
        setInput(index, value) {
            Util.assert(index == 0, "SplitTextEntity only has one input");
            if (!Util.instanceOfString2D(value)) {
                const position = this.panel.nodes.input[index].getIndicatorRect();
                Globals.notificationManager.notify("Bad input type!", { x: position.left - 50, y: position.top - 35 }, "error");
                console.error(value);
                return;
            }
            if (Util.compareString2D(this.messages, value))
                return;
            this.messages = value;
            this.elementCount.textContent = this.messages.length.toString();
            this.panel.reinitializeNodes(1, this.messages.length);
            this.panel.nodes.input[0].setLabel(this.getNodeValueType("input", 0));
            for (let i = 0; i < this.messages.length; i++)
                this.panel.nodes.output[i].setLabel(this.getNodeValueType("output", i));
            this.panel.events.emit("nodesUpdated");
            for (let i = 0; i < this.messages.length; i++)
                this.panel.events.emit("outputUpdated", i, this.getOutput(i));
        }
        getOutput(index) {
            Util.assert(index < this.messages.length, "Invalid output index");
            return [this.messages[index]];
        }
        getNodeValueType(type, index) {
            if (type == "input" && index == 0)
                return "string[][]";
            if (type == "output" && index >= 0 && index < this.messages.length)
                return "string[][]";
            Util.assert(false, `Cannot get type of ${type} node at index ${index} on SplitMessagesEntity`);
        }
        onConnectionDisconnect(type, index) {
            if (type == "input")
                this.setInput(0, []);
        }
        serialize() {
            return {
                type: "Split",
                position: this.panel.position,
            };
        }
        deserialize(data) {
            this.panel.setPosition(data.position.x, data.position.y);
        }
    }
    Panel_1.SplitPanelContent = SplitPanelContent;
    /** Panel content, processes message */
    class ProcessPanelContent extends Util.ElementProxy {
        panel;
        checkboxLowercase;
        checkboxUppercase;
        checkboxRemoveSpaces;
        inputMessages;
        outputMessages;
        constructor() {
            super(`<div class="process-panel-content"></div>`);
            this.inputMessages = [];
            this.outputMessages = [];
            this.checkboxLowercase = new Util.Checkbox("Lowercase", false);
            this.element.appendChild(this.checkboxLowercase.getHTMLElement());
            this.checkboxLowercase.events.listen(this, "change", (value) => {
                if (value)
                    this.checkboxUppercase.override(false);
                this.process();
            });
            this.checkboxUppercase = new Util.Checkbox("Uppercase", false);
            this.element.appendChild(this.checkboxUppercase.getHTMLElement());
            this.checkboxUppercase.events.listen(this, "change", (value) => {
                if (value)
                    this.checkboxLowercase.override(false);
                this.process();
            });
            this.checkboxRemoveSpaces = new Util.Checkbox("Remove Spaces", false);
            this.element.appendChild(this.checkboxRemoveSpaces.getHTMLElement());
            this.checkboxRemoveSpaces.events.listen(this, "change", () => this.process());
        }
        process() {
            this.outputMessages = this.inputMessages.map((m) => m.slice());
            for (let i = 0; i < this.outputMessages.length; i++) {
                for (let j = 0; j < this.outputMessages[i].length; j++) {
                    if (this.checkboxLowercase.isChecked)
                        this.outputMessages[i][j] = this.outputMessages[i][j].toLowerCase();
                    else if (this.checkboxUppercase.isChecked)
                        this.outputMessages[i][j] = this.outputMessages[i][j].toUpperCase();
                    if (this.checkboxRemoveSpaces.isChecked && this.outputMessages[i][j] == " ")
                        this.outputMessages[i].splice(j--, 1);
                }
            }
            this.panel.events.emit("nodesUpdated");
            this.panel.events.emit("outputUpdated", 0, this.getOutput(0));
        }
        setPanel(panel) {
            this.panel = panel;
            this.panel.reinitializeNodes(1, 1);
            this.panel.nodes.input[0].setLabel(this.getNodeValueType("input", 0));
            this.panel.nodes.output[0].setLabel(this.getNodeValueType("output", 0));
        }
        setInput(index, value) {
            Util.assert(index == 0, "TextEntity only has one input");
            if (!Util.instanceOfString2D(value)) {
                const position = this.panel.nodes.input[index].getIndicatorRect();
                Globals.notificationManager.notify("Bad input type!", { x: position.left - 50, y: position.top - 35 }, "error");
                console.error(value);
                return;
            }
            if (Util.compareString2D(this.inputMessages, value))
                return;
            this.inputMessages = value;
            this.process();
            this.panel.events.emit("nodesUpdated");
            this.panel.events.emit("outputUpdated", 0, this.getOutput(0));
        }
        getOutput(index) {
            Util.assert(index == 0, "TextEntity only has one output");
            return this.outputMessages;
        }
        getNodeValueType(type, index) {
            if (type == "input" && index == 0)
                return "string[][]";
            if (type == "output" && index == 0)
                return "string[][]";
            Util.assert(false, `Cannot get type of ${type} node at index ${index} on PreviewMessagesEntity`);
        }
        onConnectionDisconnect(type, index) {
            if (type == "input")
                this.setInput(0, []);
        }
        serialize() {
            return {
                type: "Process",
                position: this.panel.position,
                checkboxLowercase: this.checkboxLowercase.isChecked,
                checkboxUppercase: this.checkboxUppercase.isChecked,
                checkboxRemoveSpaces: this.checkboxRemoveSpaces.isChecked,
            };
        }
        deserialize(data) {
            this.panel.setPosition(data.position.x, data.position.y);
            this.checkboxLowercase.override(data.checkboxLowercase);
            this.checkboxUppercase.override(data.checkboxUppercase);
            this.checkboxRemoveSpaces.override(data.checkboxRemoveSpaces);
        }
    }
    Panel_1.ProcessPanelContent = ProcessPanelContent;
    /** Handles creating new panels by dragging from the background. */
    class PanelCreator extends Util.ElementProxy {
        isVisible;
        constructor() {
            super(`<div class="panel-creator"></div>`);
            this.setVisible(false);
            this.setPosition(0, 0);
            // Add buttons for each panel type
            WorldManager.ALL_PANELS.forEach((type) => {
                const button = Util.createHTMLElement(`<div class="panel-creator-button">${type}</div>`);
                button.addEventListener("click", () => this.selectPanelType(type));
                this.element.appendChild(button);
            });
        }
        selectPanelType(type) {
            Globals.worldManager.selectPanelType(type);
            this.setVisible(false);
        }
        setVisible(isVisible) {
            this.isVisible = isVisible;
            this.element.classList.toggle("visible", isVisible);
        }
        open(worldX, worldY) {
            this.setVisible(true);
            this.setPosition(worldX, worldY);
        }
        close() {
            this.setVisible(false);
        }
    }
    Panel_1.PanelCreator = PanelCreator;
    /** Global manager for panel connections, panel creation. */
    class WorldManager {
        static ALL_PANELS = ["User Input", "Preview", "Split", "Process"];
        panels;
        connections;
        currentConnection;
        panelCreator;
        constructor() {
            this.panels = [];
            this.connections = [];
            this.currentConnection = null;
            this.panelCreator = new PanelCreator();
            Globals.contentBackground.addEventListener("mousedown", (e) => this.onBackgroundMouseDown(e));
            Globals.contentContainer.addEventListener("mousemove", (e) => this.onMouseMove(e));
            this.setupButtons();
        }
        setupButtons() {
            const container = Util.createHTMLElement(`<div class="main-buttons"></div>`);
            const buttonAddPanel = Util.createHTMLElement(`<div class="add-panel-main-button">+</div>`);
            const buttonSave = Util.createHTMLElement(`<div class="save-main-button">Save</div>`);
            const buttonLoad = Util.createHTMLElement(`<div class="load-main-button">Load</div>`);
            buttonAddPanel.addEventListener("click", (e) => this.onButtonPressed(e, "addPanel"));
            buttonSave.addEventListener("click", (e) => this.onButtonPressed(e, "save"));
            buttonLoad.addEventListener("click", (e) => this.onButtonPressed(e, "load"));
            container.appendChild(buttonAddPanel);
            container.appendChild(buttonSave);
            container.appendChild(buttonLoad);
            document.body.appendChild(container);
        }
        addPanel(panel) {
            this.panels.push(panel);
            panel.events.listen(this, "remove", (panel) => this.onPanelRemoved(panel));
            panel.events.listen(this, "nodeHovered", (type, index) => {
                this.onHoverPanelNode(panel, type, index);
            });
            panel.events.listen(this, "nodeUnhovered", (type, index) => {
                this.onUnhoverPanelNode(panel, type, index);
            });
            panel.events.listen(this, "nodeClicked", (type, index) => {
                if (type === "input")
                    this.onClickPanelTargetNode(panel, index);
                else
                    this.onClickPanelSourceNode(panel, index);
            });
            return panel;
        }
        connectPanels(sourcePanel, sourceindex, targetPanel, targetindex) {
            const connection = new PanelConnection();
            connection.set(sourcePanel, sourceindex, targetPanel, targetindex);
            this.connections.push(connection);
        }
        selectPanelType(type) {
            // Add panel to world
            const position = this.panelCreator.getPosition();
            let panel;
            switch (type) {
                case "User Input":
                    panel = this.addPanel(new Panel(new UserInputContent(), "User Input"));
                    break;
                case "Preview":
                    panel = this.addPanel(new Panel(new PreviewPanelContent(), "Preview"));
                    break;
                case "Split":
                    panel = this.addPanel(new Panel(new SplitPanelContent(), "Split"));
                    break;
                case "Process":
                    panel = this.addPanel(new Panel(new ProcessPanelContent(), "Process"));
                    break;
                default:
                    throw new Error(`Unknown panel type ${type}`);
            }
            panel.setPosition(position.x, position.y);
            // Try connect to new panel index 0
            if (this.currentConnection) {
                let successful = false;
                // Try connect to input node
                if (this.currentConnection.sourcePanel) {
                    if (!this.currentConnection.canConnectWith(panel, "input", 0)) {
                        Globals.notificationManager.notify("Cannot connect to input node", { x: position.x - 50, y: position.y - 35 }, "error");
                    }
                    else {
                        this.currentConnection.setTarget(panel, 0);
                        Util.assert(this.currentConnection.isConnected, "Connection should be connected after setting target");
                        successful = true;
                    }
                }
                // Try connect to output node
                else {
                    if (!this.currentConnection.canConnectWith(panel, "output", 0)) {
                        Globals.notificationManager.notify("Cannot connect to output node", { x: position.x - 50, y: position.y - 35 }, "error");
                    }
                    else {
                        this.currentConnection.setSource(panel, 0);
                        Util.assert(this.currentConnection.isConnected, "Connection should be connected after setting source");
                        successful = true;
                    }
                }
                // Handle finishing the connection
                if (successful)
                    this.connections.push(this.currentConnection);
                else
                    this.currentConnection.remove();
                this.currentConnection = null;
                this.onHeldConnectionFinish();
            }
        }
        onClickPanelSourceNode(panel, index) {
            if (this.currentConnection) {
                // Dont allow if connection cannot connect
                if (!this.currentConnection.canConnectWith(panel, "output", index)) {
                    const position = panel.nodes.output[index].getIndicatorRect();
                    Globals.notificationManager.notify("Cannot connect to node", { x: position.left - 50, y: position.top - 35 }, "error");
                    return;
                }
                // Dont allow if connection already exists
                const existingConnection = this.connections.find((c) => c.sourcePanel === panel &&
                    c.sourceIndex === index &&
                    c.targetPanel === this.currentConnection.targetPanel &&
                    c.targetIndex === this.currentConnection.targetIndex);
                if (existingConnection) {
                    this.currentConnection.remove();
                    this.currentConnection = null;
                    this.onHeldConnectionFinish();
                    return;
                }
                // Connect the source node and finish if needed
                this.currentConnection.setSource(panel, index);
                Util.assert(this.currentConnection.isConnected, "Connection should be connected after setting source");
                this.connections.push(this.currentConnection);
                this.currentConnection = null;
                this.onHeldConnectionFinish();
            }
            else {
                // Start a new connection if not holding one
                this.currentConnection = new PanelConnection();
                this.currentConnection.setSource(panel, index);
                this.onHeldConnectionStart();
            }
        }
        onClickPanelTargetNode(panel, index) {
            if (this.currentConnection) {
                // Dont allow if cannot connect
                if (!this.currentConnection.canConnectWith(panel, "input", index)) {
                    const position = panel.nodes.input[index].getIndicatorRect();
                    Globals.notificationManager.notify("Cannot connect to node", { x: position.left - 50, y: position.top - 35 }, "error");
                    return;
                }
                // Delete any connections with same target
                const existingConnection = this.connections.find((c) => c.targetPanel === panel && c.targetIndex === index);
                if (existingConnection)
                    existingConnection.remove();
                // Connect the target node and finish if needed
                this.currentConnection.setTarget(panel, index);
                Util.assert(this.currentConnection.isConnected, "Connection should be connected after setting target");
                this.connections.push(this.currentConnection);
                this.currentConnection = null;
                this.onHeldConnectionFinish();
            }
            else {
                // Check if the target node is already connected, and if so grab connection
                const existingConnection = this.connections.find((c) => c.targetPanel === panel && c.targetIndex === index);
                if (existingConnection) {
                    this.currentConnection = existingConnection;
                    this.currentConnection.unsetTarget();
                    this.connections = this.connections.filter((c) => c !== this.currentConnection);
                    this.onHeldConnectionStart();
                    return;
                }
                // Otherwise start a new connection with the target
                this.currentConnection = new PanelConnection();
                this.currentConnection.setTarget(panel, index);
                this.onHeldConnectionStart();
            }
        }
        onHeldConnectionStart() {
            Globals.scroller.setCanDrag(false);
        }
        onHeldConnectionFinish() {
            Globals.scroller.setCanDrag(true);
        }
        onHoverPanelNode(panel, type, index) {
            if (this.currentConnection != null && !this.currentConnection.canConnectWith(panel, type, index)) {
                if (type == "input")
                    panel.nodes.input[index].setInvalid(true);
                else
                    panel.nodes.output[index].setInvalid(true);
            }
        }
        onUnhoverPanelNode(panel, type, index) {
            if (type == "input")
                panel.nodes.input[index].setInvalid(false);
            else
                panel.nodes.output[index].setInvalid(false);
        }
        onConnectionRemoved(connection) {
            this.connections = this.connections.filter((c) => c !== connection);
        }
        onPanelRemoved(panel) {
            panel.events.unlisten(this);
            this.panels = this.panels.filter((p) => p !== panel);
        }
        onBackgroundMouseDown(e) {
            let worldX = e.clientX + Globals.scroller.scroll.x;
            let worldY = e.clientY + Globals.scroller.scroll.y;
            if (this.currentConnection) {
                // Open panel creator
                if (!this.panelCreator.isVisible) {
                    this.panelCreator.open(worldX, worldY);
                    // Set position with hardcoded offsets
                    if (this.currentConnection.sourcePanel) {
                        this.currentConnection.setForcedWorldPosition(worldX, worldY + 5);
                    }
                    else {
                        this.currentConnection.setForcedWorldPosition(worldX + 110, worldY + 5);
                    }
                }
                // Close held connection
                else {
                    this.panelCreator.close();
                    this.currentConnection.remove();
                    this.currentConnection = null;
                    this.onHeldConnectionFinish();
                }
            }
            else if (this.panelCreator.isVisible) {
                this.panelCreator.close();
            }
        }
        onMouseMove(e) {
            let scrolledX = e.clientX + Globals.scroller.scroll.x;
            let scrolledY = e.clientY + Globals.scroller.scroll.y;
            if (this.currentConnection && !this.panelCreator.isVisible) {
                this.currentConnection.setForcedWorldPosition(scrolledX, scrolledY);
            }
        }
        onButtonPressed(e, type) {
            switch (type) {
                case "addPanel":
                    const rect = Globals.mainContainer.getBoundingClientRect();
                    this.panelCreator.open(rect.width / 2, rect.height / 2);
                    break;
                case "save":
                    this.serializeToLocalStorage();
                    break;
                case "load":
                    this.loadFromLocalStorage();
                    break;
                default:
                    throw new Error(`Unknown button type ${type}`);
            }
        }
        serializeToLocalStorage() {
            const data = {
                panels: this.panels.map((p) => p.serialize()),
                connections: this.connections.map((c) => ({
                    source: { panel: this.panels.indexOf(c.sourcePanel), index: c.sourceIndex },
                    target: { panel: this.panels.indexOf(c.targetPanel), index: c.targetIndex },
                })),
            };
            const dataString = JSON.stringify(data);
            localStorage.setItem("world", dataString);
        }
        loadFromLocalStorage() {
            const dataString = localStorage.getItem("world");
            if (!dataString)
                return;
            this.loadFromString(dataString);
        }
        loadFromString(dataString) {
            const data = JSON.parse(dataString);
            if (!data)
                return;
            // Clear current world
            while (this.connections.length > 0)
                this.connections[0].remove();
            this.connections = [];
            this.panels.forEach((p) => p.remove());
            this.panels = [];
            // Create all the panels
            for (let i = 0; i < data.panels.length; i++) {
                const panelData = data.panels[i];
                let panel;
                switch (panelData.type) {
                    case "User Input":
                        panel = new Panel(new UserInputContent(), "User Input");
                        break;
                    case "Preview":
                        panel = new Panel(new PreviewPanelContent(), "Preview");
                        break;
                    case "Split":
                        panel = new Panel(new SplitPanelContent(), "Split");
                        break;
                    case "Process":
                        panel = new Panel(new ProcessPanelContent(), "Process");
                        break;
                    default:
                        throw new Error(`Unknown panel type ${panelData.type}`);
                }
                panel.deserialize(panelData);
                this.addPanel(panel);
            }
            // Calculate panel dependencies
            let panels = [];
            let panelConnections = {};
            for (let i = 0; i < data.panels.length; i++) {
                panels.push(i);
                panelConnections[i] = { input: [], output: [] };
            }
            for (let i = 0; i < data.connections.length; i++) {
                panelConnections[data.connections[i].source.panel].output.push(i);
                panelConnections[data.connections[i].target.panel].input.push(i);
            }
            // Create connections
            while (panels.length > 0) {
                // Find panel with least dependencies
                // This is naive and won't work for recursive dependencies
                let bestPanel = -1;
                let bestPanelInputs = 0;
                for (let i = 0; i < panels.length; i++) {
                    const panel = panels[i];
                    const dependencies = panelConnections[panel].input.length;
                    if (bestPanel == -1 || dependencies < bestPanelInputs) {
                        bestPanel = panel;
                        bestPanelInputs = dependencies;
                    }
                }
                // Create all connections from this panel
                if (panelConnections[bestPanel]) {
                    for (let i = 0; i < panelConnections[bestPanel].output.length; i++) {
                        const connection = data.connections[panelConnections[bestPanel].output[i]];
                        this.connectPanels(this.panels[connection.source.panel], connection.source.index, this.panels[connection.target.panel], connection.target.index);
                    }
                }
                panels = panels.filter((p) => p != bestPanel);
            }
        }
    }
    Panel_1.WorldManager = WorldManager;
})(Panel || (Panel = {}));
document.fonts.ready.then(() => {
    // Setup globals
    Globals.mainContainer = document.querySelector(".main-container");
    Globals.contentContainer = document.querySelector(".content-container");
    Globals.contentBackground = Globals.contentContainer.querySelector(".background");
    Globals.svgContainer = document.querySelector(".svg-container");
    Globals.worldManager = new Panel.WorldManager();
    Globals.scroller = new Util.ElementScroller(Globals.mainContainer, Globals.contentBackground);
    Globals.notificationManager = new Util.NotificationManager(Globals.contentContainer);
    // Load a preset world
    Globals.worldManager.loadFromString(`{
            "panels":[
                {
                    "type":"User Input",
                    "position":{"x":40,"y":70},
                    "inputMessages":[
                        "50,66,5,48,62,13,75,29,24,61,42,70,66,62,32,14,81,8,15,78,2,29,13,49,1,80,82,40,63,81,21,19,0,40,51,65,26,14,21,70,47,44,48,42,19,48,13,47,19,49,72,31,5,24,3,43,59,67,33,49,41,60,21,26,30,5,25,20,71,11,74,56,4,74,19,71,4,51,41,43,80,72,54,63,79,81,15,16,44,31,30,12,33,57,28,13,64,43,48",
                        "80,66,5,48,62,13,75,29,24,61,42,70,66,62,32,14,81,8,15,78,2,29,13,49,1,29,11,30,52,81,21,19,0,25,26,54,20,14,21,70,47,44,48,42,19,48,13,47,19,49,44,26,59,77,64,43,79,28,72,64,1,30,73,23,67,6,33,25,64,81,68,46,17,36,13,17,21,68,13,9,46,67,57,34,62,82,15,10,73,62,2,11,65,72,37,44,10,43,68,62,9,34,18",
                        "36,66,5,48,62,13,75,29,24,61,42,70,66,62,32,14,81,8,15,78,2,29,13,49,1,69,76,52,9,48,66,80,22,64,57,40,49,78,3,16,56,19,47,40,80,6,13,64,29,49,64,63,6,49,31,13,16,10,45,24,26,77,10,60,81,61,34,54,70,21,15,4,66,77,42,37,30,22,0,11,41,72,57,20,23,57,65,41,23,18,72,42,5,3,26,78,8,5,54,45,77,25,64,61,16,44,54,51,20,63,25,11,26,45,53,60,38,34",
                        "76,66,5,49,75,54,69,46,32,1,42,60,26,48,50,80,32,24,55,61,47,12,21,12,49,54,34,25,36,15,56,55,20,9,8,62,13,82,9,44,29,60,53,82,42,80,5,43,71,3,80,77,47,78,34,25,62,18,10,49,62,64,52,81,11,66,62,13,47,17,52,70,26,23,32,31,64,23,35,32,50,6,1,25,8,37,47,43,26,76,65,68,80,17,7,45,63,14,53,63,60,16",
                        "63,66,5,49,75,54,2,60,29,40,78,47,60,75,67,71,60,2,65,7,47,14,45,74,59,41,80,13,60,13,81,22,35,50,40,39,2,59,48,31,76,2,80,75,1,56,67,11,21,8,40,65,45,75,55,39,60,42,13,3,22,57,2,6,58,9,70,1,58,56,63,68,25,79,7,20,19,64,2,66,73,30,71,16,12,30,65,37,20,13,22,63,18,46,64,59,41,81,82,22,78,36,47,17,4,6,17,5,36,79,63,1,64,69,15,43,4,58,56,31,14,64,58,18,44,78,69,1,0,46,20,71,73,25,35,8,24",
                        "34,66,5,49,75,54,23,74,11,13,28,26,19,48,67,57,37,60,34,28,74,10,17,32,11,18,19,43,19,81,42,4,62,9,46,49,32,51,76,58,4,43,47,17,67,79,21,32,44,16,30,37,26,28,41,68,57,34,51,10,69,70,8,6,46,43,18,39,47,43,15,13,33,30,35,62,37,0,37,5,38,55,37,13,40,25,9,21,11,64,5,79,42,68,11,71,11,48,3,67,61,40,22,14,35,50,61,39,11,2,66,49,51,53,17,73,36,75,74,54,24,30,54,70",
                        "27,66,5,49,75,54,2,60,29,40,2,55,9,15,59,18,68,3,36,5,47,77,44,38,1,18,28,76,4,34,60,63,58,80,17,54,79,75,48,54,55,19,62,64,14,47,51,70,75,5,11,47,45,58,68,69,79,25,38,45,73,47,68,50,34,45,78,26,79,57,4,56,22,60,18,75,43,60,59,67,63,42,49,33,40,65,79,77,7,3,26,62,31,78,26,57,69,40,4,23,26,13,67,42,38,72,11,39,65,60,25,6,80,66,68,77,59,78,19",
                        "77,66,5,49,75,54,2,60,29,40,2,55,9,15,59,18,68,3,36,5,47,60,21,80,1,72,55,16,82,35,57,19,1,66,18,27,39,17,74,81,39,14,78,0,25,65,43,66,64,38,81,23,24,50,57,30,71,75,26,68,54,57,56,50,71,73,14,21,8,32,26,63,5,37,19,43,66,47,53,34,66,23,73,31,54,38,77,67,11,63,79,6,22,21,51,69,74,21,5,17,67,37,29,21,60,14,82,44,30,4,20,42,35,1,31,54,46,20,40,30",
                        "33,66,5,49,75,54,2,60,29,40,2,55,9,15,59,18,68,3,36,5,47,33,21,59,44,18,28,76,59,34,60,63,79,27,12,54,5,49,48,54,55,52,62,72,69,10,57,22,58,48,67,53,7,34,32,30,31,19,26,8,34,46,7,30,71,55,34,75,54,9,6,60,5,23,25,45,42,80,25,12,22,76,20,51,62,21,40,9,41,10,44,73,8,33,70,73,6,31,21,72,5,40,61,51,42,66,64,74,61,25,63,42,24,41"
                    ],
                    "delim":","
                },
                {
                    "type":"Preview",
                    "position":{"x":750,"y":70}
                }
            ],
            "connections":[
                {"source":{"panel":0,"index":0},"target":{"panel":1,"index":0}}
            ]
        }`);
});
