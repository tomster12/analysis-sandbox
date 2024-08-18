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
    /** Check if a value is Cipher.Message[]. */
    function isCipherMessageArray(value) {
        return value instanceof Array && value.every((v) => v instanceof Cipher.Message);
    }
    Util.isCipherMessageArray = isCipherMessageArray;
    /** Convert a message into a consistent visual element. */
    function createMessageElement(message) {
        const parent = Util.createHTMLElement(`<div class="message"></div>`);
        for (const letter of message.letters) {
            const el = Util.createHTMLElement(`<span>${letter}</span>`);
            // Set font size based on letter length
            el.style.fontSize = `${0.7 - (letter.length - 1) * 0.15}rem`;
            parent.appendChild(el);
        }
        return parent;
    }
    Util.createMessageElement = createMessageElement;
    /** A simple event bus for passing events between to listeners. */
    class EventBus {
        eventToHandleToFunc;
        handleToEvent;
        constructor() {
            this.eventToHandleToFunc = {};
            this.handleToEvent = new Map();
        }
        listen(listener, event, callback) {
            if (!this.eventToHandleToFunc[event])
                this.eventToHandleToFunc[event] = new Map();
            this.eventToHandleToFunc[event].set(listener, callback);
            if (!this.handleToEvent.has(listener))
                this.handleToEvent.set(listener, []);
            this.handleToEvent.get(listener).push(event);
        }
        unlisten(handle) {
            Util.assert(this.handleToEvent.has(handle), "Handle does not exist");
            for (const event of this.handleToEvent.get(handle))
                this.eventToHandleToFunc[event].delete(handle);
            this.handleToEvent.delete(handle);
        }
        emit(event, ...args) {
            if (this.eventToHandleToFunc[event] === undefined)
                return;
            for (const [listener, callback] of this.eventToHandleToFunc[event])
                callback(...args);
        }
    }
    Util.EventBus = EventBus;
})(Util || (Util = {}));
var Cipher;
(function (Cipher) {
    /** Generic message class used by cryptography. */
    class Message {
        letters;
        constructor(letters) {
            this.letters = letters;
        }
        static parseFromString(text, delimeter = "") {
            return new Message(text.split(delimeter));
        }
        equals(other) {
            return this.letters.length === other.letters.length && this.letters.every((v, i) => v === other.letters[i]);
        }
    }
    Cipher.Message = Message;
})(Cipher || (Cipher = {}));
var Main;
(function (Main) {
    class Scroller {
        elementWrapper;
        elementBackground;
        isDragging;
        scroll;
        initialMouse;
        initialScroll;
        constructor(elementWrapper, elementBackground) {
            this.elementWrapper = elementWrapper;
            this.elementBackground = elementBackground;
            this.scroll = { x: 0, y: 0 };
            this.initialMouse = { x: 0, y: 0 };
            this.initialScroll = { x: 0, y: 0 };
            this.updateElement();
            this.elementBackground.addEventListener("mousedown", (e) => this.onBackgroundMouseDown(e));
            this.elementBackground.addEventListener("mousemove", (e) => this.onBackgroundMouseMove(e));
            this.elementBackground.addEventListener("mouseup", (e) => this.onBackgroundMouseUp(e));
        }
        updateElement() {
            this.elementWrapper.scrollLeft = this.scroll.x;
            this.elementWrapper.scrollTop = this.scroll.y;
        }
        onBackgroundMouseDown(e) {
            this.isDragging = true;
            this.initialMouse.x = e.clientX;
            this.initialMouse.y = e.clientY;
            this.initialScroll.x = this.scroll.x;
            this.initialScroll.y = this.scroll.y;
            document.body.style.cursor = "grabbing";
            this.elementBackground.style.cursor = "grabbing";
        }
        onBackgroundMouseMove(e) {
            if (!this.isDragging)
                return;
            this.scroll.x = Math.max(0, this.initialScroll.x - (e.clientX - this.initialMouse.x));
            this.scroll.y = Math.max(0, this.initialScroll.y - (e.clientY - this.initialMouse.y));
            this.updateElement();
        }
        onBackgroundMouseUp(e) {
            this.isDragging = false;
            document.body.style.cursor = "default";
            this.elementBackground.style.cursor = "grab";
        }
    }
    Main.Scroller = Scroller;
    /** A proxy to a HTML element which can be moved around and removed. */
    class BaseEntity {
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
        setPosition(x, y) {
            this.element.style.left = x + "px";
            this.element.style.top = y + "px";
            this.position = { x, y };
            this.events.emit("move", this.position);
        }
        setParent(parent) {
            parent.appendChild(this.element);
        }
        getHTMLElement() {
            return this.element;
        }
    }
    Main.BaseEntity = BaseEntity;
    class NotificationManager {
        container;
        constructor(elementContainer) {
            this.container = elementContainer;
        }
        notify(message, position, type = "info") {
            const el = new BaseEntity(`
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
    Main.NotificationManager = NotificationManager;
    function isCompatibleValueType(sourceType, targetType) {
        if (sourceType == targetType)
            return true;
        if (sourceType == "Message" && targetType == "Message[]")
            return true;
        return false;
    }
    Main.isCompatibleValueType = isCompatibleValueType;
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
    Main.PanelNode = PanelNode;
    /** Panel which can contain content and have input / output nodes. */
    class Panel extends BaseEntity {
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
                <div class="panel-entity">
                    <div class="panel-entity-bar">
                        <div class="panel-entity-bar-title">${title}</div>
                        <img class="panel-entity-bar-close"></img>
                    </div>
                    <div class="panel-entity-body">
                        <div class="panel-entity-nodes input"></div>
                        <div class="panel-entity-content"></div>
                        <div class="panel-entity-nodes output"></div>
                    </div>
                </div>`);
            this.elementBar = this.element.querySelector(".panel-entity-bar");
            this.elementBarTitle = this.element.querySelector(".panel-entity-bar-title");
            this.elementBarClose = this.element.querySelector(".panel-entity-bar-close");
            this.elementContent = this.element.querySelector(".panel-entity-content");
            this.elementInputNodes = this.element.querySelector(".panel-entity-nodes.input");
            this.elementOutputNodes = this.element.querySelector(".panel-entity-nodes.output");
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
            Globals.PanelManager.registerPanel(this);
        }
        createNode(type, index) {
            const element = Util.createHTMLElement(`
                <div class="panel-entity-node">
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
            if (inputCount != this.nodes.input.length) {
                this.elementInputNodes.innerHTML = "";
                this.nodes.input = [];
                for (let i = 0; i < inputCount; i++) {
                    const node = this.createNode("input", i);
                    this.elementInputNodes.appendChild(node.element);
                    this.nodes.input.push(node);
                }
            }
            if (outputCount != this.nodes.output.length) {
                this.elementOutputNodes.innerHTML = "";
                this.nodes.output = [];
                for (let i = 0; i < outputCount; i++) {
                    const node = this.createNode("output", i);
                    this.elementOutputNodes.appendChild(node.element);
                    this.nodes.output.push(node);
                }
            }
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
    Main.Panel = Panel;
    /** Global manager referenced by Panels to manage connections between them. */
    class PanelManager {
        panels;
        connections;
        currentConnection;
        constructor() {
            this.panels = [];
            this.connections = [];
            this.currentConnection = null;
            Globals.mainContainer.addEventListener("mousedown", (e) => this.onMainMouseDown(e));
        }
        registerPanel(panel) {
            this.panels.push(panel);
            panel.events.listen(this, "remove", (panel) => this.onPanelRemoved(panel));
            panel.events.listen(this, "nodeHovered", (type, index) => {
                this.onHoverNode(panel, type, index);
            });
            panel.events.listen(this, "nodeUnhovered", (type, index) => {
                this.onUnhoverNode(panel, type, index);
            });
            panel.events.listen(this, "nodeClicked", (type, index) => {
                if (type === "input")
                    this.onClickTargetNode(panel, index);
                else
                    this.onClickSourceNode(panel, index);
            });
        }
        connect(sourcePanel, sourceindex, targetPanel, targetindex) {
            const connection = new PanelConnection();
            connection.set(sourcePanel, sourceindex, targetPanel, targetindex);
            this.connections.push(connection);
        }
        onClickSourceNode(panel, index) {
            if (this.currentConnection) {
                // Dont allow if connection cannot connect
                if (!this.currentConnection.canConnectWith(panel, "output", index)) {
                    const position = panel.nodes.output[index].getIndicatorRect();
                    Globals.notificationManager.notify("Wrong input type", { x: position.left - 50, y: position.top - 35 }, "error");
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
                    return;
                }
                // Connect the source node and finish if needed
                this.currentConnection.setSource(panel, index);
                if (this.currentConnection.isConnected) {
                    this.connections.push(this.currentConnection);
                    this.currentConnection = null;
                }
            }
            else {
                // Start a new connection if not holding one
                this.currentConnection = new PanelConnection();
                this.currentConnection.setSource(panel, index);
            }
        }
        onClickTargetNode(panel, index) {
            if (this.currentConnection) {
                // Dont allow if cannot connect
                if (!this.currentConnection.canConnectWith(panel, "input", index)) {
                    const position = panel.nodes.input[index].getIndicatorRect();
                    Globals.notificationManager.notify("Wrong input type", { x: position.left - 50, y: position.top - 35 }, "error");
                    return;
                }
                // Delete any connections with same target
                const existingConnection = this.connections.find((c) => c.targetPanel === panel && c.targetIndex === index);
                if (existingConnection)
                    existingConnection.remove();
                // Connect the target node and finish if needed
                this.currentConnection.setTarget(panel, index);
                if (this.currentConnection.isConnected) {
                    this.connections.push(this.currentConnection);
                    this.currentConnection = null;
                }
            }
            else {
                // Check if the target node is already connected, and if so grab connection
                const existingConnection = this.connections.find((c) => c.targetPanel === panel && c.targetIndex === index);
                if (existingConnection) {
                    this.currentConnection = existingConnection;
                    this.currentConnection.unsetTarget();
                    return;
                }
                // Otherwise start a new connection with the target
                this.currentConnection = new PanelConnection();
                this.currentConnection.setTarget(panel, index);
            }
        }
        onHoverNode(panel, type, index) {
            if (this.currentConnection != null && !this.currentConnection.canConnectWith(panel, type, index)) {
                if (type == "input")
                    panel.nodes.input[index].setInvalid(true);
                else
                    panel.nodes.output[index].setInvalid(true);
            }
        }
        onUnhoverNode(panel, type, index) {
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
        onMainMouseDown(e) {
            e.stopPropagation();
            if (this.currentConnection) {
                this.currentConnection.remove();
                this.currentConnection = null;
            }
        }
    }
    Main.PanelManager = PanelManager;
    /** Visual and representation of a connection between two panels. */
    class PanelConnection {
        element;
        isConnected;
        sourcePanel;
        targetPanel;
        sourceIndex;
        targetIndex;
        sourceScreenPos;
        targetScreenPos;
        mouseMoveListener = (e) => this.onMouseMoved(e);
        constructor() {
            this.element = document.createElementNS("http://www.w3.org/2000/svg", "path");
            Globals.svgContainer.appendChild(this.element);
            document.addEventListener("mousemove", this.mouseMoveListener);
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
            if (!this.targetScreenPos)
                this.targetScreenPos = this.sourceScreenPos;
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
            if (!this.sourceScreenPos)
                this.sourceScreenPos = this.targetScreenPos;
            if (!this.isConnected)
                document.body.style.cursor = "pointer";
            this.updateElement();
        }
        canConnectWith(panel, type, index) {
            // Dont allow if any of the following:
            // - Same panel -> panel
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
            document.removeEventListener("mousemove", this.mouseMoveListener);
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
            document.removeEventListener("mousemove", this.mouseMoveListener);
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
            Globals.PanelManager.onConnectionRemoved(this);
        }
        unsetSource() {
            Util.assert(this.isConnected, "Connection is not connected");
            this.isConnected = false;
            document.body.style.cursor = "pointer";
            document.addEventListener("mousemove", this.mouseMoveListener);
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
            document.addEventListener("mousemove", this.mouseMoveListener);
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
            const sourceRect = this.sourcePanel.nodes.output[this.sourceIndex].getIndicatorRect();
            this.sourceScreenPos = {
                x: sourceRect.left + sourceRect.width / 2 + Globals.scroller.scroll.x,
                y: sourceRect.top + sourceRect.height / 2 + Globals.scroller.scroll.y,
            };
        }
        recalculateTargetPos() {
            if (!this.targetPanel)
                return;
            const targetRect = this.targetPanel.nodes.input[this.targetIndex].getIndicatorRect();
            this.targetScreenPos = {
                x: targetRect.left + targetRect.width / 2 + Globals.scroller.scroll.x,
                y: targetRect.top + targetRect.height / 2 + Globals.scroller.scroll.y,
            };
        }
        updateElement() {
            const dx = this.targetScreenPos.x - this.sourceScreenPos.x;
            const dy = this.targetScreenPos.y - this.sourceScreenPos.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            // Interpolate from 0 -> 60 with distance 40 -> 100
            const controlOffsetT = Math.min(1, Math.max(0, (dist - 30) / (120 - 30)));
            const controlOffset = Easing.easeOutQuad(controlOffsetT) * 60;
            const p1X = this.sourceScreenPos.x;
            const p1Y = this.sourceScreenPos.y;
            const p2X = this.targetScreenPos.x;
            const p2Y = this.targetScreenPos.y;
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
                Globals.notificationManager.notify("Source node removed", this.sourceScreenPos, "warning");
                this.remove();
                return;
            }
            this.recalculateSourcePos();
            this.updateElement();
        }
        onTargetNodesUpdated() {
            // Check target index is still within range
            if (this.targetIndex >= this.targetPanel.nodes.input.length) {
                Globals.notificationManager.notify("Target node removed", this.targetScreenPos, "warning");
                this.remove();
                return;
            }
            this.recalculateTargetPos();
            this.updateElement();
        }
        onMouseMoved(e) {
            // Stop caring the mouse position if it's already connected
            if (this.isConnected)
                document.removeEventListener("mousemove", this.mouseMoveListener);
            const mousePos = { x: e.clientX, y: e.clientY };
            mousePos.x += Globals.scroller.scroll.x;
            mousePos.y += Globals.scroller.scroll.y;
            if (!this.sourcePanel)
                this.sourceScreenPos = mousePos;
            else
                this.recalculateSourcePos();
            if (!this.targetPanel)
                this.targetScreenPos = mousePos;
            else
                this.recalculateTargetPos();
            this.updateElement();
        }
    }
    Main.PanelConnection = PanelConnection;
    /** Panel content, displays messages. */
    class HardcodedEntity extends BaseEntity {
        panel;
        messages;
        constructor(messages) {
            super(`<div class="hardcoded-entity"></div>`);
            this.messages = messages;
            this.element.innerHTML = "";
            this.messages.forEach((message) => {
                this.element.appendChild(Util.createMessageElement(message));
            });
        }
        setPanel(panel) {
            this.panel = panel;
            this.panel.reinitializeNodes(0, 1);
            this.panel.nodes.output[0].setLabel(this.getNodeValueType("output", 0));
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
                return "Message[]";
            Util.assert(false, `Cannot get type of ${type} node at index ${index} on HardcodedEntity`);
        }
        onConnectionDisconnect(type, index) { }
    }
    Main.HardcodedEntity = HardcodedEntity;
    /** Panel content, previews messages. */
    class PreviewMessagesEntity extends BaseEntity {
        panel;
        messages;
        constructor() {
            super(`<div class="preview-messages-entity empty"></div>`);
        }
        setPanel(panel) {
            this.panel = panel;
            this.panel.reinitializeNodes(1, 1);
            this.panel.nodes.input[0].setLabel(this.getNodeValueType("input", 0));
            this.panel.nodes.output[0].setLabel(this.getNodeValueType("output", 0));
        }
        setInput(index, value) {
            Util.assert(index == 0, "TextEntity only has one input");
            // Exit early with notification if the value is invalid
            if (!Util.isCipherMessageArray(value)) {
                const position = this.panel.nodes.input[index].getIndicatorRect();
                Globals.notificationManager.notify("Wrong input type", { x: position.left - 50, y: position.top - 35 }, "error");
                return;
            }
            // Exit early if the value is the same
            if (this.messages && this.messages.length === value.length && this.messages.every((m, i) => m.equals(value[i])))
                return;
            // Set message and visual
            this.messages = value;
            this.element.innerHTML = "";
            this.messages.forEach((message) => {
                this.element.appendChild(Util.createMessageElement(message));
            });
            if (this.messages.length === 0)
                this.element.classList.add("empty");
            else
                this.element.classList.remove("empty");
            // Trigger events
            this.panel.events.emit("nodesUpdated");
            this.panel.events.emit("outputUpdated", 0, this.getOutput(0));
        }
        getOutput(index) {
            Util.assert(index == 0, "TextEntity only has one output");
            return this.messages;
        }
        getNodeValueType(type, index) {
            if (type == "input" && index == 0)
                return "Message[]";
            if (type == "output" && index == 0)
                return "Message[]";
            Util.assert(false, `Cannot get type of ${type} node at index ${index} on PreviewMessagesEntity`);
        }
        onConnectionDisconnect(type, index) {
            if (type == "input")
                this.setInput(0, []);
        }
    }
    Main.PreviewMessagesEntity = PreviewMessagesEntity;
    /** Panel content, splits messages into lines. */
    class SplitMessagesEntity extends BaseEntity {
        elementCount;
        panel;
        messages;
        constructor() {
            super(`<div class="split-messages-entity"><p>0</p></div>`);
            this.elementCount = this.element.querySelector("p");
        }
        setPanel(panel) {
            this.panel = panel;
            this.panel.reinitializeNodes(1, 0);
            this.panel.nodes.input[0].setLabel(this.getNodeValueType("input", 0));
        }
        setInput(index, value) {
            Util.assert(index == 0, "SplitTextEntity only has one input");
            // Exit early with notification if the value is invalid
            if (!Util.isCipherMessageArray(value)) {
                const position = this.panel.nodes.input[index].getIndicatorRect();
                Globals.notificationManager.notify("Wrong input type", { x: position.left - 50, y: position.top - 35 }, "error");
                return;
            }
            // Exit early if the value is the same
            if (this.messages && this.messages.length === value.length && this.messages.every((m, i) => m.equals(value[i])))
                return;
            // Set message and visual
            this.messages = value;
            this.elementCount.innerText = this.messages.length.toString();
            // Update panel node counts and labels
            this.panel.reinitializeNodes(1, this.messages.length);
            this.panel.nodes.input[0].setLabel(this.getNodeValueType("input", 0));
            for (let i = 0; i < this.messages.length; i++)
                this.panel.nodes.output[i].setLabel(this.getNodeValueType("output", 0));
            // Trigger events
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
                return "Message[]";
            if (type == "output" && index >= 0 && index < this.messages.length)
                return "Message[]";
            Util.assert(false, `Cannot get type of ${type} node at index ${index} on SplitMessagesEntity`);
        }
        onConnectionDisconnect(type, index) {
            if (type == "input")
                this.setInput(0, []);
        }
    }
    Main.SplitMessagesEntity = SplitMessagesEntity;
    class BlockEntity extends BaseEntity {
        panel;
        constructor() {
            super(`<div class="block-entity"></div>`);
        }
        setPanel(panel) {
            this.panel = panel;
            panel.reinitializeNodes(1, 0);
            this.panel.nodes.input[0].setLabel(this.getNodeValueType("input", 0));
        }
        setInput(index, value) {
            Util.assert(false, "BlockEntity should never receive input");
        }
        getOutput(index) {
            Util.assert(false, "BlockEntity does not have any outputs");
            return [];
        }
        getNodeValueType(type, index) {
            return "None";
        }
        onConnectionDisconnect(type, index) { }
    }
    Main.BlockEntity = BlockEntity;
})(Main || (Main = {}));
(function () {
    Globals.mainContainer = document.querySelector(".main-container");
    Globals.contentContainer = document.querySelector(".content-container");
    Globals.svgContainer = document.querySelector(".svg-container");
    Globals.scroller = new Main.Scroller(Globals.mainContainer, Globals.contentContainer.querySelector(".background"));
    Globals.notificationManager = new Main.NotificationManager(document.querySelector(".notification-container"));
    Globals.PanelManager = new Main.PanelManager();
    const p1 = new Main.Panel(new Main.HardcodedEntity([Cipher.Message.parseFromString("Hello World"), Cipher.Message.parseFromString("And Again")]), "Text");
    const p2 = new Main.Panel(new Main.HardcodedEntity([
        Cipher.Message.parseFromString("0123232433422323"),
        Cipher.Message.parseFromString("45645632234456454"),
        Cipher.Message.parseFromString("13231212323232"),
    ]), "Text");
    const p3 = new Main.Panel(new Main.PreviewMessagesEntity(), "Preview");
    const p6 = new Main.Panel(new Main.PreviewMessagesEntity(), "Preview");
    const p4 = new Main.Panel(new Main.SplitMessagesEntity(), "Split");
    const p5 = new Main.Panel(new Main.HardcodedEntity([new Cipher.Message(["1", "23", "54", "4"])]), "Text");
    const p7 = new Main.Panel(new Main.BlockEntity(), "Block");
    p1.setPosition(70, 100);
    p2.setPosition(40, 350);
    p5.setPosition(40, 600);
    p3.setPosition(550, 150);
    p6.setPosition(550, 300);
    p4.setPosition(580, 450);
    p7.setPosition(550, 600);
    Globals.PanelManager.connect(p1, 0, p3, 0);
})();
