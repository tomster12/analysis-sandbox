namespace Globals {
    export let mainContainer: HTMLElement;
    export let contentContainer: HTMLElement;
    export let contentBackground: HTMLElement;
    export let svgContainer: HTMLElement;
<<<<<<< HEAD

    export let globalEventBus: Util.PriorityEventBus;
=======
>>>>>>> bb69be1e63f050128d01c3caef1a494973adb74f
    export let panelCreator: Main.PanelCreator;
    export let scroller: Main.Scroller;
    export let notificationManager: Main.NotificationManager;
    export let PanelManager: Main.PanelManager;
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

    /** A simple event bus for passing events to listeners. */
    export class EventBus {
        dictEventHandleFunc: { [key: string]: Map<object, Function> };
        dictHandleEvent: Map<object, string[]>;

        constructor() {
            this.dictEventHandleFunc = {};
            this.dictHandleEvent = new Map();
        }

        listen(listener: object, event: string, callback: Function) {
            if (!this.dictEventHandleFunc[event]) this.dictEventHandleFunc[event] = new Map();
            this.dictEventHandleFunc[event].set(listener, callback);

            if (!this.dictHandleEvent.has(listener)) this.dictHandleEvent.set(listener, []);
            this.dictHandleEvent.get(listener).push(event);
        }

        unlisten(handle: object) {
            Util.assert(this.dictHandleEvent.has(handle), "Handle does not exist");
            for (const event of this.dictHandleEvent.get(handle)) this.dictEventHandleFunc[event].delete(handle);
            this.dictHandleEvent.delete(handle);
        }

        emit(event: string, ...args: any[]) {
            if (this.dictEventHandleFunc[event] === undefined) return;
            for (const [listener, callback] of this.dictEventHandleFunc[event]) callback(...args);
        }
    }

    export class PriorityEventBus {
        dictEventPriorityHandleFunc: { [key: string]: { [key: number]: Map<object, Function> } };
        dictEventPriorities: { [key: string]: number[] };
        dictHandleEvent: Map<object, { event: string; priority: number }[]>;

        constructor() {
            this.dictEventPriorityHandleFunc = {};
            this.dictEventPriorities = {};
            this.dictHandleEvent = new Map();
        }

        listen(listener: object, event: string, priority: number, callback: Function) {
            if (!this.dictEventPriorityHandleFunc[event]) this.dictEventPriorityHandleFunc[event] = {};
            if (!this.dictEventPriorityHandleFunc[event][priority]) this.dictEventPriorityHandleFunc[event][priority] = new Map();
            this.dictEventPriorityHandleFunc[event][priority].set(listener, callback);

            if (!this.dictHandleEvent.has(listener)) this.dictHandleEvent.set(listener, []);
            this.dictHandleEvent.get(listener).push({ event, priority });

            if (!this.dictEventPriorities[event]) this.dictEventPriorities[event] = [];
            if (this.dictEventPriorities[event].indexOf(priority) == -1) {
                this.dictEventPriorities[event].push(priority);
                this.dictEventPriorities[event] = this.dictEventPriorities[event].sort((a, b) => b - a);
            }
        }

        unlisten(handle: object) {
            Util.assert(this.dictHandleEvent.has(handle), "Handle does not exist");
            for (const sub of this.dictHandleEvent.get(handle)) {
                this.dictEventPriorityHandleFunc[sub.event][sub.priority].delete(handle);
                if (this.dictEventPriorityHandleFunc[sub.event][sub.priority].size == 0) {
                    delete this.dictEventPriorityHandleFunc[sub.event][sub.priority];
                }
            }
            this.dictHandleEvent.delete(handle);
        }

        emit(event: string, ...args: any[]) {
            if (this.dictEventPriorityHandleFunc[event] === undefined) return;
            for (const priority of this.dictEventPriorities[event]) {
                for (const [listener, callback] of this.dictEventPriorityHandleFunc[event][priority]) {
                    if (callback(...args)) return;
                }
            }
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

namespace Main {
    export type ValueType = Cipher.Message[];

    export type ValueTypeString = "Message[]" | "None";

    export function isCompatibleValueType(sourceType: ValueTypeString, targetType: ValueTypeString): boolean {
        if (sourceType == targetType) return true;
        return false;
    }

    /** Listens to mouse events on a background element and scrolls a target element. */
    export class Scroller {
        elementWrapper: HTMLElement;
        elementBackground: HTMLElement;
        isDragging: boolean;
        scroll: { x: number; y: number };
        initialMouse: { x: number; y: number };
        initialScroll: { x: number; y: number };

        constructor(elementWrapper: HTMLElement, elementBackground: HTMLElement) {
            this.elementWrapper = elementWrapper;
            this.elementBackground = elementBackground;
            this.scroll = { x: 0, y: 0 };
            this.initialMouse = { x: 0, y: 0 };
            this.initialScroll = { x: 0, y: 0 };
            this.updateElement();

            Globals.globalEventBus.listen(this, "backgroundmousedown", 0, (e) => this.onBackgroundMouseDown(e));
            this.elementBackground.addEventListener("mousemove", (e) => this.onBackgroundMouseMove(e));
            this.elementBackground.addEventListener("mouseup", (e) => this.onBackgroundMouseUp(e));
        }

        updateElement() {
            this.elementWrapper.scrollLeft = this.scroll.x;
            this.elementWrapper.scrollTop = this.scroll.y;
        }

        onBackgroundMouseDown(e: MouseEvent) {
            this.isDragging = true;
            this.initialMouse.x = e.clientX;
            this.initialMouse.y = e.clientY;
            this.initialScroll.x = this.scroll.x;
            this.initialScroll.y = this.scroll.y;
            document.body.style.cursor = "grabbing";
            this.elementBackground.style.cursor = "grabbing";
            return true;
        }

        onBackgroundMouseMove(e: MouseEvent) {
            if (!this.isDragging) return;
            this.scroll.x = Math.max(0, this.initialScroll.x - (e.clientX - this.initialMouse.x));
            this.scroll.y = Math.max(0, this.initialScroll.y - (e.clientY - this.initialMouse.y));
            this.updateElement();
        }

        onBackgroundMouseUp(e: MouseEvent) {
            this.isDragging = false;
            document.body.style.cursor = "default";
            this.elementBackground.style.cursor = "grab";
        }
    }

    /** A proxy to an HTML element which can be moved around and removed. */
    export class BaseEntity {
        element: HTMLElement;
        events: Util.EventBus;
        position: { x: number; y: number };

        constructor(elementString: string) {
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

    /** Handles adding notifications to the screen. */
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

    export type PanelNodeType = "input" | "output";

    /** Content which can be placed inside a Panel. */
    export interface IPanelContent extends BaseEntity {
        setPanel(panel: Panel): void;
        setInput(index: number, value: Cipher.Message[]): void;
        getOutput(index: number): Cipher.Message[];
        getNodeValueType(type: PanelNodeType, index: number): ValueTypeString;
        onConnectionDisconnect(type: PanelNodeType, index: number): void;
    }

    /** Utility class for panel. */
    export class PanelNode {
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

        setInvalid(invalid: boolean) {
            this.element.classList.toggle("invalid", invalid);
        }

        getIndicatorRect(): DOMRect {
            return this.elementIndicator.getBoundingClientRect();
        }
    }

    /** Panel which can contain content and have input / output nodes. */
    export class Panel extends BaseEntity {
        elementBar: HTMLElement;
        elementBarTitle: HTMLElement;
        elementBarClose: HTMLElement;
        elementContent: HTMLElement;
        elementInputNodes: HTMLElement;
        elementOutputNodes: HTMLElement;

        content: IPanelContent;
        nodes: { input: PanelNode[]; output: PanelNode[] };
        isDragging: boolean;
        initialMouseX: number;
        initialMouseY: number;
        initialOffsetX: number;
        initialOffsetY: number;

        constructor(content: IPanelContent, title: string) {
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

        createNode(type: PanelNodeType, index: number): PanelNode {
            const element = Util.createHTMLElement(`
                <div class="panel-entity-node">
                    <div class="hover-box"></div>
                    <div class="indicator"></div>
                    <span class="label"></span>
                </div>`);

            const elementIndicator: HTMLElement = element.querySelector(".indicator");
            const elementLabel: HTMLElement = element.querySelector(".label");

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

        setInput(index: number, value: ValueType) {
            this.content.setInput(index, value);
        }

        getOutput(index: number): ValueType {
            return this.content.getOutput(index);
        }

        getNodeValueType(type: PanelNodeType, index: number): ValueTypeString {
            return this.content.getNodeValueType(type, index);
        }

        onConnectionDisconnect(type: PanelNodeType, index: number) {
            this.content.onConnectionDisconnect(type, index);
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
            this.elementBar.style.cursor = "grab";
        }
    }

    /** Visual and representation of a connection between two panels. */
    export class PanelConnection {
        element: SVGPathElement;
        isConnected: boolean;
        sourcePanel: Panel;
        targetPanel: Panel;
        sourceIndex: number;
        targetIndex: number;
        sourceScreenPos: { x: number; y: number };
        targetScreenPos: { x: number; y: number };
        mouseMoveListener = (e: MouseEvent) => this.onMouseMoved(e);

        constructor() {
            this.element = document.createElementNS("http://www.w3.org/2000/svg", "path");
            Globals.svgContainer.appendChild(this.element);
            document.addEventListener("mousemove", this.mouseMoveListener);
            this.isConnected = false;
        }

        setSource(panel: Panel, index: number) {
            Util.assert(!this.isConnected, "Connection is already connected");

            this.sourcePanel = panel;
            this.sourceIndex = index;
            this.sourcePanel.events.listen(this, "move", () => this.onSourceNodesUpdated());
            this.sourcePanel.events.listen(this, "nodesUpdated", () => this.onSourceNodesUpdated());
            this.sourcePanel.events.listen(this, "remove", () => this.remove());
            this.sourcePanel.nodes.output[this.sourceIndex].setConnecting(true);

            if (this.targetPanel) this.establish();

            this.recalculateSourcePos();
            if (!this.targetScreenPos) this.targetScreenPos = this.sourceScreenPos;
            if (!this.isConnected) document.body.style.cursor = "pointer";
            this.updateElement();
        }

        setTarget(panel: Panel, index: number) {
            Util.assert(!this.isConnected, "Connection is already connected");

            this.targetPanel = panel;
            this.targetIndex = index;
            this.targetPanel.events.listen(this, "move", () => this.onTargetNodesUpdated());
            this.targetPanel.events.listen(this, "nodesUpdated", () => this.onTargetNodesUpdated());
            this.targetPanel.events.listen(this, "remove", () => this.remove());
            this.targetPanel.nodes.input[this.targetIndex].setConnecting(true);

            if (this.sourcePanel) this.establish();

            this.recalculateTargetPos();
            if (!this.sourceScreenPos) this.sourceScreenPos = this.targetScreenPos;
            if (!this.isConnected) document.body.style.cursor = "pointer";
            this.updateElement();
        }

        canConnectWith(panel: Panel, type: PanelNodeType, index: number): boolean {
            // Dont allow if any of the following:
            // - Same panel -> panel
            // - Input -> input OR output -> output
            // - Incompatible types (directional)
            if (this.isConnected) return false;
            if (panel == this.sourcePanel || panel == this.targetPanel) return false;
            if (this.sourcePanel != null && type == "output") return false;
            if (this.targetPanel != null && type == "input") return false;
            if (this.sourcePanel != null)
                return isCompatibleValueType(this.sourcePanel.getNodeValueType("output", this.sourceIndex), panel.getNodeValueType(type, index));
            if (this.targetPanel != null)
                return isCompatibleValueType(panel.getNodeValueType(type, index), this.targetPanel.getNodeValueType("input", this.targetIndex));
            return false;
        }

        set(sourcePanel: Panel, sourceindex: number, targetPanel: Panel, targetindex: number) {
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

            this.sourcePanel.events.listen(this, "outputUpdated", (index: number, value: ValueType) => {
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
            if (!this.sourcePanel) return;
            const sourceRect = this.sourcePanel.nodes.output[this.sourceIndex].getIndicatorRect();
            this.sourceScreenPos = {
                x: sourceRect.left + sourceRect.width / 2 + Globals.scroller.scroll.x,
                y: sourceRect.top + sourceRect.height / 2 + Globals.scroller.scroll.y,
            };
        }

        recalculateTargetPos() {
            if (!this.targetPanel) return;
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

        onMouseMoved(e: MouseEvent) {
            // Stop caring the mouse position if it's already connected
            if (this.isConnected) document.removeEventListener("mousemove", this.mouseMoveListener);

            const mousePos = { x: e.clientX, y: e.clientY };
            mousePos.x += Globals.scroller.scroll.x;
            mousePos.y += Globals.scroller.scroll.y;
            if (!this.sourcePanel) this.sourceScreenPos = mousePos;
            else this.recalculateSourcePos();
            if (!this.targetPanel) this.targetScreenPos = mousePos;
            else this.recalculateTargetPos();
            this.updateElement();
        }
    }

    /** Global manager referenced by Panels to manage connections between them. */
    export class PanelManager {
        panels: Panel[];
        connections: PanelConnection[];
        currentConnection: PanelConnection | null;

        constructor() {
            this.panels = [];
            this.connections = [];
            this.currentConnection = null;
            Globals.globalEventBus.listen(this, "backgroundmousedown", 1, (e) => this.onBackgroundMouseDown(e));
        }

        registerPanel(panel: Panel) {
            this.panels.push(panel);

            panel.events.listen(this, "remove", (panel: Panel) => this.onPanelRemoved(panel));

            panel.events.listen(this, "nodeHovered", (type: PanelNodeType, index: number) => {
                this.onHoverNode(panel, type, index);
            });

            panel.events.listen(this, "nodeUnhovered", (type: PanelNodeType, index: number) => {
                this.onUnhoverNode(panel, type, index);
            });

            panel.events.listen(this, "nodeClicked", (type: PanelNodeType, index: number) => {
                if (type === "input") this.onClickTargetNode(panel, index);
                else this.onClickSourceNode(panel, index);
            });
        }

        connect(sourcePanel: Panel, sourceindex: number, targetPanel: Panel, targetindex: number) {
            const connection = new PanelConnection();
            connection.set(sourcePanel, sourceindex, targetPanel, targetindex);
            this.connections.push(connection);
        }

        onClickSourceNode(panel: Panel, index: number) {
            if (this.currentConnection) {
                // Dont allow if connection cannot connect
                if (!this.currentConnection.canConnectWith(panel, "output", index)) {
                    const position = panel.nodes.output[index].getIndicatorRect();
                    Globals.notificationManager.notify("Wrong input type", { x: position.left - 50, y: position.top - 35 }, "error");
                    return;
                }

                // Dont allow if connection already exists
                const existingConnection = this.connections.find(
                    (c) =>
                        c.sourcePanel === panel &&
                        c.sourceIndex === index &&
                        c.targetPanel === this.currentConnection.targetPanel &&
                        c.targetIndex === this.currentConnection.targetIndex
                );
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
            } else {
                // Start a new connection if not holding one
                this.currentConnection = new PanelConnection();
                this.currentConnection.setSource(panel, index);
            }
        }

        onClickTargetNode(panel: Panel, index: number) {
            if (this.currentConnection) {
                // Dont allow if cannot connect
                if (!this.currentConnection.canConnectWith(panel, "input", index)) {
                    const position = panel.nodes.input[index].getIndicatorRect();
                    Globals.notificationManager.notify("Wrong input type", { x: position.left - 50, y: position.top - 35 }, "error");
                    return;
                }

                // Delete any connections with same target
                const existingConnection = this.connections.find((c) => c.targetPanel === panel && c.targetIndex === index);
                if (existingConnection) existingConnection.remove();

                // Connect the target node and finish if needed
                this.currentConnection.setTarget(panel, index);
                if (this.currentConnection.isConnected) {
                    this.connections.push(this.currentConnection);
                    this.currentConnection = null;
                }
            } else {
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

        onHoverNode(panel: Panel, type: PanelNodeType, index: number) {
            if (this.currentConnection != null && !this.currentConnection.canConnectWith(panel, type, index)) {
                if (type == "input") panel.nodes.input[index].setInvalid(true);
                else panel.nodes.output[index].setInvalid(true);
            }
        }

        onUnhoverNode(panel: Panel, type: PanelNodeType, index: number) {
            if (type == "input") panel.nodes.input[index].setInvalid(false);
            else panel.nodes.output[index].setInvalid(false);
        }

        onConnectionRemoved(connection: PanelConnection) {
            this.connections = this.connections.filter((c) => c !== connection);
        }

        onPanelRemoved(panel: Panel) {
            panel.events.unlisten(this);
            this.panels = this.panels.filter((p) => p !== panel);
        }

        onBackgroundMouseDown(e: MouseEvent) {
            if (this.currentConnection) {
                if (!Globals.panelCreator.isVisible) {
                    Globals.panelCreator.open();
                    // this.currentConnection.remove();
                    // this.currentConnection = null;
                    return true;
                }
            }
            return false;
        }

        onCreatorClose() {}
    }

    /** Handles creating new panels by dragging from the background. */
    export class PanelCreator extends BaseEntity {
        isVisible: boolean;

        constructor() {
            super(`<div class="panel-creator"></div>`);
            this.setVisible(false);
            Globals.globalEventBus.listen(this, "backgroundmousedown", 1, (e) => this.onBackgroundMouseDown(e));
        }

        setVisible(isVisible: boolean) {
            console.log(`Setting visible: ${isVisible}`);
            this.isVisible = isVisible;
            this.element.classList.toggle("visible", isVisible);
        }

        open() {
            this.setVisible(true);
        }

        close() {
            this.setVisible(false);
        }

        onBackgroundMouseDown(e: MouseEvent) {
            if (!this.isVisible) return false;
            this.close();
            return true;
        }
    }

    /** Panel content, displays messages. */
    export class HardcodedEntity extends BaseEntity implements IPanelContent {
        panel: Panel;
        messages: Cipher.Message[];

        constructor(messages: Cipher.Message[]) {
            super(`<div class="hardcoded-entity"></div>`);

            this.messages = messages;
            this.element.innerHTML = "";
            this.messages.forEach((message: Cipher.Message) => {
                this.element.appendChild(Util.createMessageElement(message));
            });
        }

        setPanel(panel: Panel) {
            this.panel = panel;
            this.panel.reinitializeNodes(0, 1);
            this.panel.nodes.output[0].setLabel(this.getNodeValueType("output", 0));
        }

        setInput(_index: number, _value: ValueType) {
            Util.assert(false, "TextEntity does not have any inputs");
        }

        getOutput(index: number): Cipher.Message[] {
            Util.assert(index == 0, "TextEntity only has one output");
            return this.messages;
        }

        getNodeValueType(type: PanelNodeType, index: number): ValueTypeString {
            if (type == "output" && index == 0) return "Message[]";
            Util.assert(false, `Cannot get type of ${type} node at index ${index} on HardcodedEntity`);
        }

        onConnectionDisconnect(type: PanelNodeType, index: number) {}
    }

    /** Panel content, previews messages. */
    export class PreviewMessagesEntity extends BaseEntity implements IPanelContent {
        panel: Panel;
        messages: Cipher.Message[];

        constructor() {
            super(`<div class="preview-messages-entity empty"></div>`);
        }

        setPanel(panel: Panel) {
            this.panel = panel;
            this.panel.reinitializeNodes(1, 1);
            this.panel.nodes.input[0].setLabel(this.getNodeValueType("input", 0));
            this.panel.nodes.output[0].setLabel(this.getNodeValueType("output", 0));
        }

        setInput(index: number, value: ValueType) {
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

        getNodeValueType(type: PanelNodeType, index: number): ValueTypeString {
            if (type == "input" && index == 0) return "Message[]";
            if (type == "output" && index == 0) return "Message[]";

            Util.assert(false, `Cannot get type of ${type} node at index ${index} on PreviewMessagesEntity`);
        }

        onConnectionDisconnect(type: PanelNodeType, index: number) {
            if (type == "input") this.setInput(0, []);
        }
    }

    /** Panel content, splits messages into lines. */
    export class SplitMessagesEntity extends BaseEntity implements IPanelContent {
        elementCount: HTMLElement;
        panel: Panel;
        messages: Cipher.Message[];

        constructor() {
            super(`<div class="split-messages-entity"><p>0</p></div>`);
            this.elementCount = this.element.querySelector("p");
        }

        setPanel(panel: Panel) {
            this.panel = panel;
            this.panel.reinitializeNodes(1, 0);
            this.panel.nodes.input[0].setLabel(this.getNodeValueType("input", 0));
        }

        setInput(index: number, value: ValueType) {
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

            // Update panel node counts and labels
            this.panel.reinitializeNodes(1, this.messages.length);
            this.panel.nodes.input[0].setLabel(this.getNodeValueType("input", 0));
            for (let i = 0; i < this.messages.length; i++) this.panel.nodes.output[i].setLabel(this.getNodeValueType("output", 0));

            // Trigger events
            this.panel.events.emit("nodesUpdated");
            for (let i = 0; i < this.messages.length; i++) this.panel.events.emit("outputUpdated", i, this.getOutput(i));
        }

        getOutput(index: number): Cipher.Message[] {
            Util.assert(index < this.messages.length, "Invalid output index");

            return [this.messages[index]];
        }

        getNodeValueType(type: PanelNodeType, index: number): ValueTypeString {
            if (type == "input" && index == 0) return "Message[]";
            if (type == "output" && index >= 0 && index < this.messages.length) return "Message[]";

            Util.assert(false, `Cannot get type of ${type} node at index ${index} on SplitMessagesEntity`);
        }

        onConnectionDisconnect(type: PanelNodeType, index: number) {
            if (type == "input") this.setInput(0, []);
        }
    }

    /** Panel content, debug block. */
    export class BlockEntity extends BaseEntity implements IPanelContent {
        panel: Panel;

        constructor() {
            super(`<div class="block-entity"></div>`);
        }

        setPanel(panel: Panel) {
            this.panel = panel;
            panel.reinitializeNodes(1, 0);
            this.panel.nodes.input[0].setLabel(this.getNodeValueType("input", 0));
        }

        setInput(index: number, value: ValueType) {
            Util.assert(false, "BlockEntity should never receive input");
        }

        getOutput(index: number): Cipher.Message[] {
            Util.assert(false, "BlockEntity does not have any outputs");
            return [];
        }

        getNodeValueType(type: PanelNodeType, index: number): ValueTypeString {
            return "None";
        }

        onConnectionDisconnect(type: PanelNodeType, index: number) {}
    }
}

(function () {
    Globals.mainContainer = document.querySelector(".main-container");
    Globals.contentContainer = document.querySelector(".content-container");
    Globals.contentBackground = Globals.contentContainer.querySelector(".background");
    Globals.svgContainer = document.querySelector(".svg-container");
<<<<<<< HEAD

    Globals.globalEventBus = new Util.PriorityEventBus();
=======
>>>>>>> bb69be1e63f050128d01c3caef1a494973adb74f
    Globals.panelCreator = new Main.PanelCreator();
    Globals.scroller = new Main.Scroller(Globals.mainContainer, Globals.contentBackground);
    Globals.notificationManager = new Main.NotificationManager(document.querySelector(".notification-container"));
    Globals.PanelManager = new Main.PanelManager();

    Globals.contentBackground.addEventListener("mousedown", (e) => Globals.globalEventBus.emit("backgroundmousedown", e));

    const p1 = new Main.Panel(new Main.HardcodedEntity([Cipher.Message.parseFromString("Hello World"), Cipher.Message.parseFromString("And Again")]), "Text");
    const p2 = new Main.Panel(
        new Main.HardcodedEntity([
            Cipher.Message.parseFromString("0123232433422323"),
            Cipher.Message.parseFromString("45645632234456454"),
            Cipher.Message.parseFromString("13231212323232"),
        ]),
        "Text"
    );
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
