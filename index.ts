namespace Globals {
    export let mainContainer: HTMLElement;
    export let svgContainer: HTMLElement;
    export let notificationManager: Entities.NotificationManager;
    export let panelEntityManager: Entities.PanelEntityManager;
}

namespace Easing {
    export function easeOutQuad(t: number): number {
        return 1 - (1 - t) * (1 - t);
    }
}

namespace Util {
    /** Create an HTML element from a string using innerHTML of a div.*/
    export function createHTMLElement(elementString: string): HTMLElement {
        const div = document.createElement("div");
        div.innerHTML = elementString;
        return div.firstElementChild as HTMLElement;
    }

    /** Assert a condition is true, otherwise throw an error with the given message. */
    export function assert(condition: boolean, message: string) {
        if (!condition) throw new Error(message);
    }

    /** Check if a value is Cipher.Message[]. */
    export function isCipherMessageArray(value: any): value is Cipher.Message[] {
        return value instanceof Array && value.every((v) => v instanceof Cipher.Message);
    }

    /** Convert a message into a consistent visual element. */
    export function createMessageElement(message: Cipher.Message): HTMLElement {
        const parent = Util.createHTMLElement(`<div class="message"></div>`);
        for (const letter of message.letters) {
            const el = Util.createHTMLElement(`<span>${letter}</span>`);

            // Set font size based on letter length
            el.style.fontSize = `${0.7 - (letter.length - 1) * 0.15}rem`;

            parent.appendChild(el);
        }
        return parent;
    }

    /** A simple event bus for passing events between to listeners. */
    export class EventBus {
        eventToHandleToFunc: { [key: string]: Map<object, Function> };
        handleToEvent: Map<object, string[]>;

        constructor() {
            this.eventToHandleToFunc = {};
            this.handleToEvent = new Map();
        }

        listen(listener: object, event: string, callback: Function) {
            if (!this.eventToHandleToFunc[event]) this.eventToHandleToFunc[event] = new Map();
            this.eventToHandleToFunc[event].set(listener, callback);

            if (!this.handleToEvent.has(listener)) this.handleToEvent.set(listener, []);
            this.handleToEvent.get(listener).push(event);
        }

        unlisten(handle: object) {
            Util.assert(this.handleToEvent.has(handle), "Handle does not exist");
            for (const event of this.handleToEvent.get(handle)) this.eventToHandleToFunc[event].delete(handle);
            this.handleToEvent.delete(handle);
        }

        emit(event: string, ...args: any[]) {
            if (this.eventToHandleToFunc[event] === undefined) return;
            for (const [listener, callback] of this.eventToHandleToFunc[event]) callback(...args);
        }
    }
}

namespace Cipher {
    /** Generic message class used by cryptography. */
    export class Message {
        letters: string[];

        constructor(letters: string[]) {
            this.letters = letters;
        }

        static parseFromString(text: string, delimeter = ""): Message {
            return new Message(text.split(delimeter));
        }

        equals(other: Message): boolean {
            return this.letters.length === other.letters.length && this.letters.every((v, i) => v === other.letters[i]);
        }
    }
}

namespace Entities {
    /** A proxy to a HTML element which can be moved around and removed. */
    export class BaseEntity {
        element: HTMLElement;
        events: Util.EventBus;
        position: { x: number; y: number };

        constructor(elementString: string) {
            this.element = Util.createHTMLElement(elementString);
            this.events = new Util.EventBus();
            this.position = { x: 0, y: 0 };
            this.setParent(Globals.mainContainer);
        }

        remove() {
            this.events.emit("remove", this);
            this.element.remove();
        }

        getPosition() {
            return this.position;
        }

        setPosition(x: number, y: number) {
            this.element.style.left = x + "px";
            this.element.style.top = y + "px";
            this.position = { x, y };
            this.events.emit("move", this.position);
        }

        setParent(parent: HTMLElement) {
            parent.appendChild(this.element);
        }

        getHTMLElement(): HTMLElement {
            return this.element;
        }
    }

    export type NotificationType = "info" | "warning" | "error";

    export class NotificationManager {
        container: HTMLElement;

        constructor(elementContainer: HTMLElement) {
            this.container = elementContainer;
        }

        notify(message: string, position: { x: number; y: number }, type: NotificationType = "info") {
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

    /** Content which can be placed inside a PanelEntity. */
    export interface IPanelEntityContent extends BaseEntity {
        setPanel(panel: PanelEntity): void;
        setInput(index: number, value: Cipher.Message[]): void;
        getOutput(index: number): Cipher.Message[];
    }

    export type PanelEntityNodeType = "input" | "output";

    export type PanelEntityValue = Cipher.Message[];

    export class PanelEntityNode {
        element: HTMLElement;
        elementIndicator: HTMLElement;
        elementLabel: HTMLElement;

        constructor(element: HTMLElement, elementIndicator: HTMLElement, elementLabel: HTMLElement) {
            this.element = element;
            this.elementIndicator = elementIndicator;
            this.elementLabel = elementLabel;
        }

        setLabel(label: string) {
            this.elementLabel.innerHTML = label;
        }

        setConnecting(connecting: boolean) {
            this.element.classList.toggle("connecting", connecting);
        }

        getIndicatorRect(): DOMRect {
            return this.elementIndicator.getBoundingClientRect();
        }
    }

    /** Panel which can contain content and have input / output nodes. */
    export class PanelEntity extends BaseEntity {
        elementBar: HTMLElement;
        elementBarTitle: HTMLElement;
        elementBarClose: HTMLElement;
        elementContent: HTMLElement;
        elementInputNodes: HTMLElement;
        elementOutputNodes: HTMLElement;

        content: IPanelEntityContent;
        nodes: { input: PanelEntityNode[]; output: PanelEntityNode[] };
        isDragging: boolean;
        initialMouseX: number;
        initialMouseY: number;
        initialOffsetX: number;
        initialOffsetY: number;

        constructor(content: IPanelEntityContent, title: string) {
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

            Globals.panelEntityManager.registerPanel(this);
        }

        createNode(type: PanelEntityNodeType, index: number): PanelEntityNode {
            const element = Util.createHTMLElement(`
                <div class="panel-entity-node">
                    <div class="hover-box"></div>
                    <div class="indicator"></div>
                    <span class="label"></span>
                </div>`);

            const elementIndicator: HTMLElement = element.querySelector(".indicator");
            const elementLabel: HTMLElement = element.querySelector(".label");

            element.addEventListener("mousedown", (e) => {
                e.stopPropagation();
                this.events.emit("nodeClicked", type, index);
            });

            return new PanelEntityNode(element, elementIndicator, elementLabel);
        }

        reinitializeNodes(inputCount: number, outputCount: number) {
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

        setInput(index: number, value: PanelEntityValue) {
            this.content.setInput(index, value);
        }

        getOutput(index: number): PanelEntityValue {
            return this.content.getOutput(index);
        }

        onBarMouseDown(e: MouseEvent) {
            this.isDragging = true;
            this.initialMouseX = e.clientX;
            this.initialMouseY = e.clientY;
            this.initialOffsetX = this.element.offsetLeft;
            this.initialOffsetY = this.element.offsetTop;
            document.body.style.cursor = "grabbing";
            this.elementBar.style.cursor = "grabbing";
        }

        onCloseMouseDown(e: MouseEvent) {
            this.remove();
        }

        onMouseMove(e: MouseEvent) {
            if (!this.isDragging) return;
            const deltaX = e.clientX - this.initialMouseX;
            const deltaY = e.clientY - this.initialMouseY;
            this.setPosition(this.initialOffsetX + deltaX, this.initialOffsetY + deltaY);
        }

        onMouseUp(e: MouseEvent) {
            if (!this.isDragging) return;
            this.isDragging = false;
            document.body.style.cursor = "default";
        }
    }

    /** Global manager referenced by PanelEntitys to manage connections between them. */
    export class PanelEntityManager {
        panels: PanelEntity[];
        connections: PanelEntityConnection[];
        currentConnection: PanelEntityConnection | null;

        constructor() {
            this.panels = [];
            this.connections = [];
            this.currentConnection = null;
            Globals.mainContainer.addEventListener("mousedown", (e) => this.onMainMouseDown(e));
        }

        registerPanel(panel: PanelEntity) {
            this.panels.push(panel);
            panel.events.listen(this, "remove", (panel: PanelEntity) => this.onPanelRemoved(panel));
            panel.events.listen(this, "nodeClicked", (type: PanelEntityNodeType, index: number) => {
                if (type === "input") this.connectTarget(panel, index);
                else this.connectSource(panel, index);
            });
        }

        connectTarget(panel: PanelEntity, nodeIndex: number) {
            if (this.currentConnection) {
                // Dont allow single panel loops or target -> target connections
                if (this.currentConnection.sourcePanel === panel || this.currentConnection.targetPanel != null) {
                    this.currentConnection.remove();
                    this.currentConnection = null;
                    return;
                }

                // Delete any connections with same target
                const existingConnection = this.connections.find((c) => c.targetPanel === panel && c.targetIndex === nodeIndex);
                if (existingConnection) existingConnection.remove();

                // Connect the target node and finish if needed
                this.currentConnection.setTarget(panel, nodeIndex);
                if (this.currentConnection.isConnected) {
                    this.connections.push(this.currentConnection);
                    this.currentConnection = null;
                }
            } else {
                // Check if the target node is already connected, and if so grab connection
                const existingConnection = this.connections.find((c) => c.targetPanel === panel && c.targetIndex === nodeIndex);
                if (existingConnection) {
                    this.currentConnection = existingConnection;
                    this.currentConnection.unsetTarget();
                    return;
                }

                // Otherwise start a new connection with the target
                this.currentConnection = new PanelEntityConnection();
                this.currentConnection.setTarget(panel, nodeIndex);
            }
        }

        connectSource(panel: PanelEntity, nodeIndex: number) {
            if (this.currentConnection) {
                // Dont allow single panel loops or source -> source connections
                if (this.currentConnection.targetPanel === panel || this.currentConnection.sourcePanel != null) {
                    this.currentConnection.remove();
                    this.currentConnection = null;
                    return;
                }

                // Dont allow if connection already exists
                const existingConnection = this.connections.find(
                    (c) =>
                        c.sourcePanel === panel &&
                        c.sourceIndex === nodeIndex &&
                        c.targetPanel === this.currentConnection.targetPanel &&
                        c.targetIndex === this.currentConnection.targetIndex
                );
                if (existingConnection) {
                    this.currentConnection.remove();
                    this.currentConnection = null;
                    return;
                }

                // Connect the source node and finish if needed
                this.currentConnection.setSource(panel, nodeIndex);
                if (this.currentConnection.isConnected) {
                    this.connections.push(this.currentConnection);
                    this.currentConnection = null;
                }
            } else {
                // Start a new connection if not holding one
                this.currentConnection = new PanelEntityConnection();
                this.currentConnection.setSource(panel, nodeIndex);
            }
        }

        connect(sourcePanel: PanelEntity, sourceNodeIndex: number, targetPanel: PanelEntity, targetNodeIndex: number) {
            const connection = new PanelEntityConnection();
            connection.set(sourcePanel, sourceNodeIndex, targetPanel, targetNodeIndex);
            this.connections.push(connection);
        }

        onConnectionRemoved(connection: PanelEntityConnection) {
            this.connections = this.connections.filter((c) => c !== connection);
        }

        onPanelRemoved(panel: PanelEntity) {
            panel.events.unlisten(this);
            this.panels = this.panels.filter((p) => p !== panel);
        }

        onMainMouseDown(e: MouseEvent) {
            e.stopPropagation();
            if (this.currentConnection) {
                this.currentConnection.remove();
                this.currentConnection = null;
            }
        }
    }

    /** Visual and representation of a connection between two panels. */
    export class PanelEntityConnection {
        element: SVGPathElement;
        isConnected: boolean;
        sourcePanel: PanelEntity;
        targetPanel: PanelEntity;
        sourceIndex: number;
        targetIndex: number;
        sourcePos: { x: number; y: number };
        targetPos: { x: number; y: number };
        mouseMoveListener = (e: MouseEvent) => this.onMouseMoved(e);

        constructor() {
            this.element = document.createElementNS("http://www.w3.org/2000/svg", "path");
            Globals.svgContainer.appendChild(this.element);
            document.addEventListener("mousemove", this.mouseMoveListener);
            this.isConnected = false;
        }

        setSource(panel: PanelEntity, nodeIndex: number) {
            Util.assert(!this.isConnected, "Connection is already connected");

            this.sourcePanel = panel;
            this.sourceIndex = nodeIndex;
            this.sourcePanel.events.listen(this, "move", () => this.onSourceNodesUpdated());
            this.sourcePanel.events.listen(this, "nodesUpdated", () => this.onSourceNodesUpdated());
            this.sourcePanel.events.listen(this, "remove", () => this.remove());
            this.sourcePanel.nodes.output[this.sourceIndex].setConnecting(true);

            if (this.targetPanel) this.establish();

            this.recalculateSourcePos();
            if (!this.targetPos) this.targetPos = this.sourcePos;
            if (!this.isConnected) document.body.style.cursor = "pointer";
            this.updateElement();
        }

        setTarget(panel: PanelEntity, nodeIndex: number) {
            Util.assert(!this.isConnected, "Connection is already connected");

            this.targetPanel = panel;
            this.targetIndex = nodeIndex;
            this.targetPanel.events.listen(this, "move", () => this.onTargetNodesUpdated());
            this.targetPanel.events.listen(this, "nodesUpdated", () => this.onTargetNodesUpdated());
            this.targetPanel.events.listen(this, "remove", () => this.remove());
            this.targetPanel.nodes.input[this.targetIndex].setConnecting(true);

            if (this.sourcePanel) this.establish();

            this.recalculateTargetPos();
            if (!this.sourcePos) this.sourcePos = this.targetPos;
            if (!this.isConnected) document.body.style.cursor = "pointer";
            this.updateElement();
        }

        set(sourcePanel: PanelEntity, sourceNodeIndex: number, targetPanel: PanelEntity, targetNodeIndex: number) {
            Util.assert(!this.isConnected, "Connection is already connected");

            this.sourcePanel = sourcePanel;
            this.sourceIndex = sourceNodeIndex;
            this.targetPanel = targetPanel;
            this.targetIndex = targetNodeIndex;
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

            this.sourcePanel.events.listen(this, "outputUpdated", (index: number, value: PanelEntityValue) => {
                if (index === this.sourceIndex) this.targetPanel.setInput(this.targetIndex, value);
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
                }
            }
            if (this.targetPanel) {
                this.targetPanel.events.unlisten(this);
                if (this.targetIndex < this.targetPanel.nodes.input.length) {
                    this.targetPanel.nodes.input[this.targetIndex].setConnecting(false);
                }
            }
            this.element.remove();
            Globals.panelEntityManager.onConnectionRemoved(this);
        }

        unsetSource() {
            Util.assert(this.isConnected, "Connection is not connected");
            this.isConnected = false;
            document.body.style.cursor = "pointer";
            document.addEventListener("mousemove", this.mouseMoveListener);
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
            this.targetPanel.events.unlisten(this);
            this.targetPanel = null;
            this.targetIndex = -1;
            this.updateElement();
        }

        recalculateSourcePos() {
            if (!this.sourcePanel) return;
            const sourceRect = this.sourcePanel.nodes.output[this.sourceIndex].getIndicatorRect();
            this.sourcePos = {
                x: sourceRect.left + sourceRect.width / 2,
                y: sourceRect.top + sourceRect.height / 2,
            };
        }

        recalculateTargetPos() {
            if (!this.targetPanel) return;
            const targetRect = this.targetPanel.nodes.input[this.targetIndex].getIndicatorRect();
            this.targetPos = {
                x: targetRect.left + targetRect.width / 2,
                y: targetRect.top + targetRect.height / 2,
            };
        }

        updateElement() {
            const dx = this.targetPos.x - this.sourcePos.x;
            const dy = this.targetPos.y - this.sourcePos.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            // Interpolate from 0 -> 60 with distance 40 -> 100
            const controlOffsetT = Math.min(1, Math.max(0, (dist - 30) / (120 - 30)));
            const controlOffset = Easing.easeOutQuad(controlOffsetT) * 60;

            const c1X = this.sourcePos.x + controlOffset;
            const c1Y = this.sourcePos.y;
            const c2X = this.targetPos.x - controlOffset;
            const c2Y = this.targetPos.y;
            const d = `M ${this.sourcePos.x} ${this.sourcePos.y} C ${c1X} ${c1Y}, ${c2X} ${c2Y}, ${this.targetPos.x} ${this.targetPos.y}`;
            this.element.setAttribute("d", d);
            this.element.setAttribute("stroke", "#d7d7d7");
            this.element.setAttribute("stroke-width", "3");
            this.element.setAttribute("fill", "none");
        }

        onSourceNodesUpdated() {
            // Check source index is still within range
            if (this.sourceIndex >= this.sourcePanel.nodes.output.length) {
                Globals.notificationManager.notify("Source node removed", this.sourcePos, "warning");
                this.remove();
                return;
            }

            this.recalculateSourcePos();
            this.updateElement();
        }

        onTargetNodesUpdated() {
            // Check target index is still within range
            if (this.targetIndex >= this.targetPanel.nodes.input.length) {
                Globals.notificationManager.notify("Target node removed", this.targetPos, "warning");
                this.remove();
                return;
            }

            this.recalculateTargetPos();
            this.updateElement();
        }

        onMouseMoved(e: MouseEvent) {
            // Stop caring the mouse position if it's already connected
            if (this.isConnected) document.removeEventListener("mousemove", this.mouseMoveListener);

            const mousePos = { x: e.clientX, y: e.clientY };
            if (!this.sourcePanel) this.sourcePos = mousePos;
            else this.recalculateSourcePos();
            if (!this.targetPanel) this.targetPos = mousePos;
            else this.recalculateTargetPos();
            this.updateElement();
        }
    }

    /** PanelEntity content, displays messages. */
    export class HardcodedEntity extends BaseEntity implements IPanelEntityContent {
        panel: PanelEntity;
        messages: Cipher.Message[];

        constructor(messages: Cipher.Message[]) {
            super(`<div class="hardcoded-entity"></div>`);

            this.messages = messages;
            this.element.innerHTML = "";
            this.messages.forEach((message: Cipher.Message) => {
                this.element.appendChild(Util.createMessageElement(message));
            });
        }

        setPanel(panel: PanelEntity) {
            this.panel = panel;
            this.panel.reinitializeNodes(0, 1);
            this.panel.nodes.output[0].setLabel("Message[]");
        }

        setInput(_index: number, _value: PanelEntityValue) {
            Util.assert(false, "TextEntity does not have any inputs");
        }

        getOutput(index: number): Cipher.Message[] {
            Util.assert(index == 0, "TextEntity only has one output");

            return this.messages;
        }
    }

    /** PanelEntity content, previews messages. */
    export class PreviewMessagesEntity extends BaseEntity implements IPanelEntityContent {
        panel: PanelEntity;
        messages: Cipher.Message[];

        constructor() {
            super(`<div class="preview-messages-entity empty"></div>`);
        }

        setPanel(panel: PanelEntity) {
            this.panel = panel;
            this.panel.reinitializeNodes(1, 1);
            this.panel.nodes.input[0].setLabel("Message[]");
            this.panel.nodes.output[0].setLabel("Message[]");
        }

        setInput(index: number, value: PanelEntityValue) {
            Util.assert(index == 0, "TextEntity only has one input");

            // Exit early with notification if the value is invalid
            if (!Util.isCipherMessageArray(value)) {
                const position = this.panel.nodes.input[index].getIndicatorRect();
                Globals.notificationManager.notify("Wrong input type", { x: position.left - 50, y: position.top - 35 }, "error");
                return;
            }

            // Exit early if the value is the same
            if (this.messages && this.messages.length === value.length && this.messages.every((m, i) => m.equals(value[i]))) return;

            // Set message and visual
            this.messages = value;
            this.element.innerHTML = "";
            this.messages.forEach((message: Cipher.Message) => {
                this.element.appendChild(Util.createMessageElement(message));
            });
            if (this.messages.length === 0) this.element.classList.add("empty");
            else this.element.classList.remove("empty");

            // Trigger events
            this.panel.events.emit("nodesUpdated");
            this.panel.events.emit("outputUpdated", 0, this.getOutput(0));
        }

        getOutput(index: number): Cipher.Message[] {
            Util.assert(index == 0, "TextEntity only has one output");

            return this.messages;
        }
    }

    /** PanelEntity content, splits messages into lines. */
    export class SplitMessagesEntity extends BaseEntity implements IPanelEntityContent {
        elementCount: HTMLElement;
        panel: PanelEntity;
        messages: Cipher.Message[];

        constructor() {
            super(`<div class="split-messages-entity"><p>0</p></div>`);
            this.elementCount = this.element.querySelector("p");
        }

        setPanel(panel: PanelEntity) {
            this.panel = panel;
            this.panel.reinitializeNodes(1, 0);
            this.panel.nodes.input[0].setLabel("Message[]");
        }

        setInput(index: number, value: PanelEntityValue) {
            Util.assert(index == 0, "SplitTextEntity only has one input");

            // Exit early with notification if the value is invalid
            if (!Util.isCipherMessageArray(value)) {
                const position = this.panel.nodes.input[index].getIndicatorRect();
                Globals.notificationManager.notify("Wrong input type", { x: position.left - 50, y: position.top - 35 }, "error");
                return;
            }

            // Exit early if the value is the same
            if (this.messages && this.messages.length === value.length && this.messages.every((m, i) => m.equals(value[i]))) return;

            // Set message and visual
            this.messages = value;
            this.elementCount.innerText = this.messages.length.toString();

            // Udate panel node counts and labels
            this.panel.reinitializeNodes(1, this.messages.length);
            this.panel.nodes.input[0].setLabel("Message[]");
            for (let i = 0; i < this.messages.length; i++) this.panel.nodes.output[i].setLabel("Message[]");

            // Trigger events
            this.panel.events.emit("nodesUpdated");
            for (let i = 0; i < this.messages.length; i++) this.panel.events.emit("outputUpdated", i, this.getOutput(i));
        }

        getOutput(index: number): Cipher.Message[] {
            Util.assert(index < this.messages.length, "Invalid output index");

            return [this.messages[index]];
        }
    }

    export class BlockEntity extends BaseEntity implements IPanelEntityContent {
        panel: PanelEntity;

        constructor() {
            super(`<div class="block-entity"></div>`);
        }

        setPanel(panel: PanelEntity) {
            this.panel = panel;
            panel.reinitializeNodes(1, 0);
            this.panel.nodes.input[0].setLabel("None");
        }

        setInput(index: number, value: PanelEntityValue) {
            Util.assert(index == 0, "BlockEntity only has one input");

            const position = this.panel.nodes.input[index].getIndicatorRect();
            Globals.notificationManager.notify("Wrong input type", { x: position.left - 50, y: position.top - 35 }, "error");

            // Globals.notificationManager.notify(
            //     "BlockEntity does not accept any inputs",
            //     { x: this.panel.position.x - 40, y: this.panel.position.y - 40 },
            //     "error"
            // );
        }

        getOutput(index: number): Cipher.Message[] {
            Util.assert(false, "BlockEntity does not have any outputs");
            return [];
        }
    }
}

(function () {
    Globals.mainContainer = document.querySelector(".main-container");
    Globals.svgContainer = document.querySelector(".svg-container");
    Globals.notificationManager = new Entities.NotificationManager(document.querySelector(".notification-container"));
    Globals.panelEntityManager = new Entities.PanelEntityManager();

    const p1 = new Entities.PanelEntity(
        new Entities.HardcodedEntity([Cipher.Message.parseFromString("Hello World"), Cipher.Message.parseFromString("And Again")]),
        "Text"
    );

    const p2 = new Entities.PanelEntity(
        new Entities.HardcodedEntity([
            Cipher.Message.parseFromString("0123232433422323"),
            Cipher.Message.parseFromString("45645632234456454"),
            Cipher.Message.parseFromString("13231212323232"),
        ]),
        "Text"
    );

    const p3 = new Entities.PanelEntity(new Entities.PreviewMessagesEntity(), "Preview");

    const p6 = new Entities.PanelEntity(new Entities.PreviewMessagesEntity(), "Preview");

    const p4 = new Entities.PanelEntity(new Entities.SplitMessagesEntity(), "Split");

    const p5 = new Entities.PanelEntity(new Entities.HardcodedEntity([new Cipher.Message(["1", "23", "54", "4"])]), "Text");

    const p7 = new Entities.PanelEntity(new Entities.BlockEntity(), "Block");

    p1.setPosition(70, 100);
    p2.setPosition(40, 350);
    p5.setPosition(40, 600);
    p3.setPosition(550, 150);
    p6.setPosition(550, 300);
    p4.setPosition(580, 450);
    p7.setPosition(550, 600);

    Globals.panelEntityManager.connect(p1, 0, p3, 0);
})();
