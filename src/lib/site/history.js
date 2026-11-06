// The editor's state: the blocks now, and the lists it can go back and forward to. A
// plain reducer with no React in it. Since edits make new lists, a step in history is
// just a reference to an old list, so going back restores it exactly.

export const HISTORY_LIMIT = 100;

export const initialHistory = (blocks) => ({ blocks, past: [], future: [], group: null });

export function historyReducer(state, action) {
  switch (action.type) {
    // next is null when the edit didn't apply, which changes nothing.
    // group: edits sharing one, like typing in a field, count as one step to undo.
    case "apply": {
      const { next, group = null } = action;
      if (!next || next === state.blocks) return state;
      if (group && group === state.group) return { ...state, blocks: next, future: [] };
      return { blocks: next, past: [...state.past, state.blocks].slice(-HISTORY_LIMIT), future: [], group };
    }
    // Leaving a field: the next typing there is a new step
    case "endGroup":
      return state.group ? { ...state, group: null } : state;
    case "undo": {
      if (state.past.length === 0) return state;
      return { blocks: state.past[state.past.length - 1], past: state.past.slice(0, -1), future: [state.blocks, ...state.future], group: null };
    }
    case "redo": {
      if (state.future.length === 0) return state;
      return { blocks: state.future[0], past: [...state.past, state.blocks], future: state.future.slice(1), group: null };
    }
    // Someone else's version, taken as a fresh start: there's nothing to go back to
    case "replace":
      return initialHistory(action.blocks);
    default:
      throw new Error(`Unknown action: ${action.type}`);
  }
}
