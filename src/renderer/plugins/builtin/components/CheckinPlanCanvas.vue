<script setup lang="ts">import { ref, reactive, watch, onMounted, onUnmounted } from 'vue';
import { Save, Undo, Redo, Maximize2, ZoomIn, ZoomOut, Trash2 } from 'lucide-vue-next';
import CheckinNode from './CheckinNode.vue';
import CheckinEdge from './CheckinEdge.vue';
import type { PlanNode, PlanEdge } from '@/types/checkin';
const props = defineProps<{
 nodes: PlanNode[];
 edges: PlanEdge[];
}>();
const emit = defineEmits<{
 (e: 'update', nodes: PlanNode[], edges: PlanEdge[]): void;
 (e: 'save'): void;
}>();
const canvasRef = ref<HTMLElement | null>(null);
const svgRef = ref<SVGSVGElement | null>(null);
const canvasState = reactive({
 scale: 1,
 offsetX: 0,
 offsetY: 0,
 selectedNodeId: null as string | null,
 selectedEdgeId: null as string | null,
 isDirty: false,
 isPanning: false,
 isDraggingNode: false,
 isConnecting: false,
 dragStartX: 0,
 dragStartY: 0,
 dragNodeId: null as string | null,
 connectSourceId: null as string | null,
 connectEdgeType: 'main' as 'main' | 'branch' | 'side',
 tempLineEndX: 0,
 tempLineEndY: 0,
 showContextMenu: false,
 contextMenuX: 0,
 contextMenuY: 0,
 contextMenuTarget: 'edge' as 'edge' | 'node' | null,
});
const undoStack: {
 nodes: PlanNode[];
 edges: PlanEdge[];
}[] = [];
const redoStack: {
 nodes: PlanNode[];
 edges: PlanEdge[];
}[] = [];
const localNodes = ref<PlanNode[]>(JSON.parse(JSON.stringify(props.nodes)));
const localEdges = ref<PlanEdge[]>(JSON.parse(JSON.stringify(props.edges)));

watch(() => [props.nodes, props.edges], () => {
  localNodes.value = JSON.parse(JSON.stringify(props.nodes));
  localEdges.value = JSON.parse(JSON.stringify(props.edges));
}, { deep: true });
function pushUndo() {
 undoStack.push({
 nodes: JSON.parse(JSON.stringify(localNodes.value)),
 edges: JSON.parse(JSON.stringify(localEdges.value)),
 });
 redoStack.length = 0;
 canvasState.isDirty = true;
}
function undo() {
 if (undoStack.length === 0)
 return;
 redoStack.push({
 nodes: JSON.parse(JSON.stringify(localNodes.value)),
 edges: JSON.parse(JSON.stringify(localEdges.value)),
 });
 const prev = undoStack.pop()!;
 localNodes.value = prev.nodes;
 localEdges.value = prev.edges;
 emit('update', localNodes.value, localEdges.value);
}
function redo() {
 if (redoStack.length === 0)
 return;
 undoStack.push({
 nodes: JSON.parse(JSON.stringify(localNodes.value)),
 edges: JSON.parse(JSON.stringify(localEdges.value)),
 });
 const next = redoStack.pop()!;
 localNodes.value = next.nodes;
 localEdges.value = next.edges;
 emit('update', localNodes.value, localEdges.value);
}
function handleDragOver(e: DragEvent) {
 e.preventDefault();
 if (e.dataTransfer) {
 e.dataTransfer.dropEffect = 'copy';
 }
}
function handleDrop(e: DragEvent) {
 e.preventDefault();
 if (!e.dataTransfer || !canvasRef.value)
 return;
 const data = e.dataTransfer.getData('application/json');
 if (!data)
 return;
 try {
 const taskData = JSON.parse(data);
 const rect = canvasRef.value.getBoundingClientRect();
 const x = (e.clientX - rect.left - canvasState.offsetX) / canvasState.scale - 80;
 const y = (e.clientY - rect.top - canvasState.offsetY) / canvasState.scale - 36;
 pushUndo();
 const newNode: PlanNode = {
 id: `node-${Date.now()}`,
 taskId: taskData.taskId,
 taskName: taskData.taskName,
 category: taskData.category,
 x: Math.max(0, x),
 y: Math.max(0, y),
 completed: false,
 };
 localNodes.value.push(newNode);
 emit('update', localNodes.value, localEdges.value);
 }
 catch (err) {
 console.error('Failed to parse dropped data:', err);
 }
}
function handleMouseDown(e: MouseEvent) {
 if ((e.target as HTMLElement).classList.contains('canvas-area') && !canvasState.isDraggingNode) {
 canvasState.isPanning = true;
 canvasState.dragStartX = e.clientX - canvasState.offsetX;
 canvasState.dragStartY = e.clientY - canvasState.offsetY;
 }
}
function handleMouseMove(e: MouseEvent) {
 if (canvasState.isPanning) {
 canvasState.offsetX = e.clientX - canvasState.dragStartX;
 canvasState.offsetY = e.clientY - canvasState.dragStartY;
 }
 else if (canvasState.isDraggingNode && canvasState.dragNodeId) {
 const rect = canvasRef.value?.getBoundingClientRect();
 if (rect) {
 const x = (e.clientX - rect.left - canvasState.offsetX) / canvasState.scale - 80;
 const y = (e.clientY - rect.top - canvasState.offsetY) / canvasState.scale - 36;
 const node = localNodes.value.find(n => n.id === canvasState.dragNodeId);
 if (node) {
 node.x = Math.max(0, x);
 node.y = Math.max(0, y);
 emit('update', localNodes.value, localEdges.value);
 }
 }
 }
 else if (canvasState.isConnecting && canvasRef.value) {
 const rect = canvasRef.value.getBoundingClientRect();
 canvasState.tempLineEndX = (e.clientX - rect.left - canvasState.offsetX) / canvasState.scale;
 canvasState.tempLineEndY = (e.clientY - rect.top - canvasState.offsetY) / canvasState.scale;
 }
}
function handleMouseUp(e: MouseEvent) {
 canvasState.isPanning = false;
 canvasState.isDraggingNode = false;
 canvasState.dragNodeId = null;
 if (canvasState.isConnecting) {
 const rect = canvasRef.value?.getBoundingClientRect();
 if (rect) {
 const x = (e.clientX - rect.left - canvasState.offsetX) / canvasState.scale;
 const y = (e.clientY - rect.top - canvasState.offsetY) / canvasState.scale;
 const targetNode = localNodes.value.find(n => {
 return x >= n.x && x <= n.x + 160 && y >= n.y && y <= n.y + 72;
 });
 if (targetNode && canvasState.connectSourceId && targetNode.id !== canvasState.connectSourceId) {
 const existingEdge = localEdges.value.find(e => e.sourceNodeId === canvasState.connectSourceId && e.targetNodeId === targetNode.id);
 if (!existingEdge) {
 pushUndo();
 const newEdge: PlanEdge = {
 id: `edge-${Date.now()}`,
 sourceNodeId: canvasState.connectSourceId,
 targetNodeId: targetNode.id,
 type: canvasState.connectEdgeType,
 };
 localEdges.value.push(newEdge);
 emit('update', localNodes.value, localEdges.value);
 }
 }
 }
 canvasState.isConnecting = false;
 canvasState.connectSourceId = null;
 }
}
function handleNodeDragStart(nodeId: string, e: MouseEvent) {
 canvasState.isDraggingNode = true;
 canvasState.dragNodeId = nodeId;
 canvasState.dragStartX = e.clientX;
 canvasState.dragStartY = e.clientY;
 selectNode(nodeId);
}
function handleNodeSelect(nodeId: string) {
 selectNode(nodeId);
}
function selectNode(nodeId: string) {
 canvasState.selectedNodeId = nodeId;
 canvasState.selectedEdgeId = null;
}
function selectEdge(edgeId: string) {
 canvasState.selectedEdgeId = edgeId;
 canvasState.selectedNodeId = null;
}
function handleStartConnect(nodeId: string, e: MouseEvent) {
 canvasState.isConnecting = true;
 canvasState.connectSourceId = nodeId;
 canvasState.connectEdgeType = e.button === 0 ? 'main' : e.shiftKey ? 'side' : 'branch';
 const rect = canvasRef.value?.getBoundingClientRect();
 if (rect) {
 const node = localNodes.value.find(n => n.id === nodeId);
 if (node) {
 canvasState.tempLineEndX = node.x + 160;
 canvasState.tempLineEndY = node.y + 36;
 }
 }
}
function deleteSelected() {
 if (canvasState.selectedNodeId) {
 pushUndo();
 localEdges.value = localEdges.value.filter(e => e.sourceNodeId !== canvasState.selectedNodeId &&
 e.targetNodeId !== canvasState.selectedNodeId);
 localNodes.value = localNodes.value.filter(n => n.id !== canvasState.selectedNodeId);
 canvasState.selectedNodeId = null;
 emit('update', localNodes.value, localEdges.value);
 }
 else if (canvasState.selectedEdgeId) {
 pushUndo();
 localEdges.value = localEdges.value.filter(e => e.id !== canvasState.selectedEdgeId);
 canvasState.selectedEdgeId = null;
 emit('update', localNodes.value, localEdges.value);
 }
}
function handleKeyDown(e: KeyboardEvent) {
 if ((e.key === 'Delete' || e.key === 'Backspace') && (canvasState.selectedNodeId || canvasState.selectedEdgeId)) {
 deleteSelected();
 }
 if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
 e.preventDefault();
 undo();
 }
 if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
 e.preventDefault();
 redo();
 }
}
function zoomIn() {
 canvasState.scale = Math.min(canvasState.scale + 0.25, 2);
}
function zoomOut() {
 canvasState.scale = Math.max(canvasState.scale - 0.25, 0.25);
}
function resetZoom() {
 canvasState.scale = 1;
 canvasState.offsetX = 0;
 canvasState.offsetY = 0;
}
function handleSave() {
 emit('save');
 canvasState.isDirty = false;
}
function getEdgeColor(type: string) {
 const colors: Record<string, string> = {
 'main': '#3b82f6',
 'branch': '#f97316',
 'side': '#10b981',
 };
 return colors[type] || '#3b82f6';
}
function closeContextMenu() {
 canvasState.showContextMenu = false;
}
function handleContextMenu(e: MouseEvent) {
 e.preventDefault();
 if (canvasState.selectedEdgeId) {
 canvasState.contextMenuX = e.clientX;
 canvasState.contextMenuY = e.clientY;
 canvasState.contextMenuTarget = 'edge';
 canvasState.showContextMenu = true;
 }
}
function toggleEdgeType(type: 'main' | 'branch' | 'side') {
 if (canvasState.selectedEdgeId) {
 pushUndo();
 const edge = localEdges.value.find(e => e.id === canvasState.selectedEdgeId);
 if (edge) {
 edge.type = type;
 emit('update', localNodes.value, localEdges.value);
 }
 }
 closeContextMenu();
}
function getSourceNode(edge: PlanEdge) {
 return localNodes.value.find(n => n.id === edge.sourceNodeId);
}
function getTargetNode(edge: PlanEdge) {
 return localNodes.value.find(n => n.id === edge.targetNodeId);
}
const mainEdgeCount = () => localEdges.value.filter(e => e.type === 'main').length;
const branchEdgeCount = () => localEdges.value.filter(e => e.type === 'branch').length;
const sideEdgeCount = () => localEdges.value.filter(e => e.type === 'side').length;
onMounted(() => {
 window.addEventListener('keydown', handleKeyDown);
 window.addEventListener('click', closeContextMenu);
});
onUnmounted(() => {
 window.removeEventListener('keydown', handleKeyDown);
 window.removeEventListener('click', closeContextMenu);
});
</script>

<template>
  <div class="h-full flex flex-col bg-vscode-bg">
    <div class="flex items-center justify-between px-4 py-2 bg-vscode-sidebar border-b border-vscode-border">
      <div class="flex items-center space-x-2">
        <button
          class="p-2 rounded hover:bg-vscode-selected transition-colors"
          :class="{ 'opacity-50 cursor-not-allowed': undoStack.length === 0 }"
          :disabled="undoStack.length === 0"
          @click="undo"
          title="撤销 (Ctrl+Z)"
        >
          <Undo class="w-4 h-4 text-vscode-text-secondary" />
        </button>
        <button
          class="p-2 rounded hover:bg-vscode-selected transition-colors"
          :class="{ 'opacity-50 cursor-not-allowed': redoStack.length === 0 }"
          :disabled="redoStack.length === 0"
          @click="redo"
          title="重做 (Ctrl+Y)"
        >
          <Redo class="w-4 h-4 text-vscode-text-secondary" />
        </button>
        
        <div class="w-px h-6 bg-vscode-border mx-2"></div>
        
        <button
          class="p-2 rounded hover:bg-vscode-selected transition-colors"
          @click="zoomOut"
          title="缩小"
        >
          <ZoomOut class="w-4 h-4 text-vscode-text-secondary" />
        </button>
        <span class="text-sm text-vscode-text-secondary w-16 text-center">{{ Math.round(canvasState.scale * 100) }}%</span>
        <button
          class="p-2 rounded hover:bg-vscode-selected transition-colors"
          @click="zoomIn"
          title="放大"
        >
          <ZoomIn class="w-4 h-4 text-vscode-text-secondary" />
        </button>
        <button
          class="p-2 rounded hover:bg-vscode-selected transition-colors"
          @click="resetZoom"
          title="重置视图"
        >
          <Maximize2 class="w-4 h-4 text-vscode-text-secondary" />
        </button>
      </div>
      
      <div class="flex items-center space-x-2">
        <button
          class="p-2 rounded hover:bg-vscode-selected transition-colors"
          @click="deleteSelected"
          :class="{ 'opacity-50 cursor-not-allowed': !canvasState.selectedNodeId && !canvasState.selectedEdgeId }"
          :disabled="!canvasState.selectedNodeId && !canvasState.selectedEdgeId"
          title="删除 (Delete)"
        >
          <Trash2 class="w-4 h-4 text-vscode-text-secondary" />
        </button>
        
        <button
          class="flex items-center px-3 py-1.5 rounded bg-vscode-active hover:bg-vscode-hover text-vscode-icon-hover text-sm transition-colors"
          :class="{ 'opacity-50 cursor-not-allowed': !canvasState.isDirty }"
          :disabled="!canvasState.isDirty"
          @click="handleSave"
        >
          <Save class="w-4 h-4 mr-1.5" />
          保存
        </button>
      </div>
    </div>
    
    <div
      ref="canvasRef"
      class="flex-1 relative overflow-hidden canvas-area"
      :style="{
        backgroundImage: 'radial-gradient(circle, #374151 1px, transparent 1px)',
        backgroundSize: `${20 * canvasState.scale}px ${20 * canvasState.scale}px`,
        backgroundPosition: `${canvasState.offsetX}px ${canvasState.offsetY}px`
      }"
      @dragover="handleDragOver"
      @drop="handleDrop"
      @mousedown="handleMouseDown"
      @mousemove="handleMouseMove"
      @mouseup="handleMouseUp"
      @mouseleave="handleMouseUp"
      @contextmenu="handleContextMenu"
    >
      <svg
        ref="svgRef"
        class="absolute inset-0 w-full h-full pointer-events-none"
        :style="{
          transform: `translate(${canvasState.offsetX}px, ${canvasState.offsetY}px) scale(${canvasState.scale})`,
          transformOrigin: '0 0'
        }"
      >
        <defs>
          <marker id="arrowhead-main" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto" markerUnits="strokeWidth">
            <path d="M0,0 L0,6 L9,3 z" fill="#3b82f6" />
          </marker>
          <marker id="arrowhead-branch" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto" markerUnits="strokeWidth">
            <path d="M0,0 L0,6 L9,3 z" fill="#f97316" />
          </marker>
          <marker id="arrowhead-side" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto" markerUnits="strokeWidth">
            <path d="M0,0 L0,6 L9,3 z" fill="#10b981" />
          </marker>
        </defs>
        
        <g v-for="edge in localEdges" :key="edge.id">
          <CheckinEdge
            v-if="getSourceNode(edge) && getTargetNode(edge)"
            :edge="edge"
            :source-node="getSourceNode(edge)!"
            :target-node="getTargetNode(edge)!"
            :is-selected="canvasState.selectedEdgeId === edge.id"
            @select="selectEdge"
            @delete="(id) => { pushUndo(); localEdges = localEdges.filter(e => e.id !== id); emit('update', localNodes, localEdges); }"
          />
        </g>
        
        <line
          v-if="canvasState.isConnecting && canvasState.connectSourceId"
          :x1="(localNodes.find(n => n.id === canvasState.connectSourceId)?.x || 0) + 160"
          :y1="(localNodes.find(n => n.id === canvasState.connectSourceId)?.y || 0) + 36"
          :x2="canvasState.tempLineEndX"
          :y2="canvasState.tempLineEndY"
          :stroke="getEdgeColor(canvasState.connectEdgeType)"
          stroke-width="2"
          :stroke-dasharray="canvasState.connectEdgeType === 'side' ? '6,3' : 'none'"
          stroke-linecap="round"
        />
      </svg>
      
      <div
        class="absolute inset-0"
        :style="{
          transform: `translate(${canvasState.offsetX}px, ${canvasState.offsetY}px) scale(${canvasState.scale})`,
          transformOrigin: '0 0'
        }"
      >
        <CheckinNode
          v-for="node in localNodes"
          :key="node.id"
          :node="node"
          :is-selected="canvasState.selectedNodeId === node.id"
          :is-connecting="canvasState.isConnecting"
          @select="handleNodeSelect"
          @start-connect="handleStartConnect"
          @drag-start="handleNodeDragStart"
        />
        
        <div
          v-if="localNodes.length === 0"
          class="absolute inset-0 flex items-center justify-center"
        >
          <div class="text-center text-vscode-text-secondary">
            <div class="text-4xl mb-4">📋</div>
            <p class="text-sm">从左侧任务面板拖拽任务到此处开始编排</p>
          </div>
        </div>
      </div>
    </div>
    
    <div class="flex items-center justify-between px-4 py-2 bg-vscode-sidebar border-t border-vscode-border text-xs text-vscode-text-secondary">
      <span>节点数: {{ localNodes.length }} | 连线数: {{ localEdges.length }}</span>
      <span>(主线: {{ mainEdgeCount() }} / 支线A: {{ branchEdgeCount() }} / 支线B: {{ sideEdgeCount() }})</span>
      <span :class="{ 'text-vscode-warning': canvasState.isDirty }">{{ canvasState.isDirty ? '已修改' : '已保存' }}</span>
    </div>
    
    <Teleport to="body">
      <div
        v-if="canvasState.showContextMenu && canvasState.contextMenuTarget === 'edge'"
        class="fixed z-50 bg-vscode-sidebar border border-vscode-border rounded-lg shadow-xl py-1 min-w-[140px]"
        :style="{ left: `${canvasState.contextMenuX}px`, top: `${canvasState.contextMenuY}px` }"
      >
        <button
          class="w-full px-4 py-2 text-left text-sm hover:bg-vscode-selected flex items-center space-x-2"
          @click="toggleEdgeType('main')"
        >
          <span class="w-3 h-3 rounded-full bg-blue-500"></span>
          <span class="text-vscode-text">主线 (蓝色)</span>
        </button>
        <button
          class="w-full px-4 py-2 text-left text-sm hover:bg-vscode-selected flex items-center space-x-2"
          @click="toggleEdgeType('branch')"
        >
          <span class="w-3 h-3 rounded-full bg-orange-500"></span>
          <span class="text-vscode-text">支线A (橙色)</span>
        </button>
        <button
          class="w-full px-4 py-2 text-left text-sm hover:bg-vscode-selected flex items-center space-x-2"
          @click="toggleEdgeType('side')"
        >
          <span class="w-3 h-3 rounded-full bg-green-500"></span>
          <span class="text-vscode-text">支线B (绿色虚线)</span>
        </button>
      </div>
    </Teleport>
  </div>
</template>