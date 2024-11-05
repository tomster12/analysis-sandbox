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
        for (const letter of message) {
            const el = Util.createHTMLElement(`<span>${letter}</span>`);
            // Set font size based on letter length
            let size = 1 - (letter.length - 1) * 0.25;
            size = size < 0.2 ? 0.2 : size;
            el.style.fontSize = `${size}rem`;
            content.appendChild(el);
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
            this.elementClick.addEventListener("mouseup", (e) => this.onBackgroundMouseUp(e));
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
        onBackgroundMouseUp(e) {
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
            console.log("Updating thumb");
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
                Globals.notificationManager.notify("Source node removed", this.sourceWorldPos, "warning");
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
        elementAddMessage;
        elementDelim;
        elementMessages;
        messages;
        constructor() {
            super(`<div class="user-input-panel-content">
                    <div class="user-input-messages">
                        <div class="user-input-messages-container"></div>
                        <div class="user-input-add-message">+</div>
                    </div>
                    <div class="user-input-options">
                        <p>Delimeter</p>
                        <input class="user-input-delim" contentEditable="true"></input>
                    </div>
                </div>`);
            this.elementMessagesContainer = this.element.querySelector(".user-input-messages-container");
            this.elementAddMessage = this.element.querySelector(".user-input-add-message");
            this.elementDelim = this.element.querySelector(".user-input-delim");
            this.elementMessages = [];
            this.messages = [];
            this.elementAddMessage.addEventListener("click", () => this.addMessage());
            this.elementDelim.addEventListener("input", (e) => this.onDelimChanged(e));
            this.addMessage();
        }
        addMessage() {
            const index = this.elementMessages.length;
            const elementMessage = Util.createHTMLElement(`
                <div class="user-input-message">
                    <div class="message-number">${index + 1}</div>
                    <div class="user-input-message-input" contentEditable="true"></div>
                    <div class="user-input-message-remove"><img></img></div>
                </div>`);
            const elementMessageInput = elementMessage.querySelector(".user-input-message-input");
            const elementMessageRemove = elementMessage.querySelector(".user-input-message-remove");
            this.elementMessagesContainer.appendChild(elementMessage);
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
            this.messages = this.elementMessages.map((m) => Cipher.parseMessage(m.input.innerText, this.elementDelim.value));
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
        getOutput(index) {
            Util.assert(index == 0, "TextEntity only has one output");
            return this.messages;
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
    }
    Panel_1.UserInputContent = UserInputContent;
    /** Panel content, previews messages. */
    class PreviewPanelContent extends Util.ElementProxy {
        panel;
        messages;
        constructor() {
            super(`<div class="preview-panel-content"></div>`);
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
            this.element.innerHTML = "";
            for (let i = 0; i < this.messages.length; i++) {
                this.element.appendChild(Util.createMessageElement(this.messages[i], i + 1));
            }
            this.element.classList.toggle("empty", this.messages.length === 0);
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
                console.log(value);
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
    }
    Panel_1.SplitPanelContent = SplitPanelContent;
    /** Panel content, processes message */
    class ProcessPanelContent extends Util.ElementProxy {
        panel;
        messages;
        constructor() {
            super(`<div class="process-panel-content"></div>`);
            // Add debug dropdown
            const dropdown = new Util.Dropdown({
                "Debug 1": "Debug 1",
                "Debug 2": "Debug 2",
                "Debug 3": "Debug 3",
            }, "Debug 1", "text");
            this.element.appendChild(dropdown.getHTMLElement());
        }
        process() { }
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
            this.process();
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
            WorldManager.selectablePanels.forEach((type) => {
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
        static selectablePanels = ["User Input", "Preview", "Split", "Process"];
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
        }
        onMouseMove(e) {
            let scrolledX = e.clientX + Globals.scroller.scroll.x;
            let scrolledY = e.clientY + Globals.scroller.scroll.y;
            if (this.currentConnection && !this.panelCreator.isVisible) {
                this.currentConnection.setForcedWorldPosition(scrolledX, scrolledY);
            }
        }
    }
    Panel_1.WorldManager = WorldManager;
})(Panel || (Panel = {}));
(function () {
    // Setup globals
    Globals.mainContainer = document.querySelector(".main-container");
    Globals.contentContainer = document.querySelector(".content-container");
    Globals.contentBackground = Globals.contentContainer.querySelector(".background");
    Globals.svgContainer = document.querySelector(".svg-container");
    Globals.worldManager = new Panel.WorldManager();
    Globals.scroller = new Util.ElementScroller(Globals.mainContainer, Globals.contentBackground);
    Globals.notificationManager = new Util.NotificationManager(document.querySelector(".notification-container"));
    // Setup preset world state
    const p1 = Globals.worldManager.addPanel(new Panel.Panel(new Panel.UserInputContent(), "Input"));
    const p2 = Globals.worldManager.addPanel(new Panel.Panel(new Panel.ProcessPanelContent(), "Process"));
    p1.setPosition(70, 100);
    p2.setPosition(400, 100);
})();
