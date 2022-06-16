(async () => {
function js_read_fs(path) {
  console.info('GRASS read_fs', path)
  return ""
  // const url = new URL(path, `file://${Deno.cwd()}/`);
  // if (js_is_file(path)) {
  //   const file = Deno.readTextFileSync(url);
  //   return file;
  // } else {
  //   return "";
  // }
}

function js_is_file(path) {
  console.log(`GRASS is_file`, path)
  return true
}

function js_is_dir(path) {
  console.log(`GRASS is_dir`, path)
  return false
}
const cachedTextDecoder = new TextDecoder('utf-8', { ignoreBOM: true, fatal: true });
const cachedTextEncoder = new TextEncoder('utf-8');
cachedTextDecoder.decode();

let cachegetUint8Memory0 = null;
function getUint8Memory0() {
    if (cachegetUint8Memory0 === null || cachegetUint8Memory0.buffer !== wasm.memory.buffer) {
        cachegetUint8Memory0 = new Uint8Array(wasm.memory.buffer);
    }
    return cachegetUint8Memory0;
}

function getStringFromWasm0(ptr, len) {
    return cachedTextDecoder.decode(getUint8Memory0().subarray(ptr, ptr + len));
}

const heap = new Array(32).fill(undefined);

heap.push(undefined, null, true, false);

let heap_next = heap.length;

function addHeapObject(obj) {
    if (heap_next === heap.length) heap.push(heap.length + 1);
    const idx = heap_next;
    heap_next = heap[idx];

    heap[idx] = obj;
    return idx;
}

function getObject(idx) { return heap[idx]; }

let WASM_VECTOR_LEN = 0;


const encodeString = function (arg, view) {
    return cachedTextEncoder.encodeInto(arg, view);
};

function passStringToWasm0(arg, malloc, realloc) {

    if (realloc === undefined) {
        const buf = cachedTextEncoder.encode(arg);
        const ptr = malloc(buf.length);
        getUint8Memory0().subarray(ptr, ptr + buf.length).set(buf);
        WASM_VECTOR_LEN = buf.length;
        return ptr;
    }

    let len = arg.length;
    let ptr = malloc(len);

    const mem = getUint8Memory0();

    let offset = 0;

    for (; offset < len; offset++) {
        const code = arg.charCodeAt(offset);
        if (code > 0x7F) break;
        mem[ptr + offset] = code;
    }

    if (offset !== len) {
        if (offset !== 0) {
            arg = arg.slice(offset);
        }
        ptr = realloc(ptr, len, len = offset + arg.length * 3);
        const view = getUint8Memory0().subarray(ptr + offset, ptr + len);
        const ret = encodeString(arg, view);

        offset += ret.written;
    }

    WASM_VECTOR_LEN = offset;
    return ptr;
}

function isLikeNone(x) {
    return x === undefined || x === null;
}

let cachegetInt32Memory0 = null;
function getInt32Memory0() {
    if (cachegetInt32Memory0 === null || cachegetInt32Memory0.buffer !== wasm.memory.buffer) {
        cachegetInt32Memory0 = new Int32Array(wasm.memory.buffer);
    }
    return cachegetInt32Memory0;
}

let cachegetFloat64Memory0 = null;
function getFloat64Memory0() {
    if (cachegetFloat64Memory0 === null || cachegetFloat64Memory0.buffer !== wasm.memory.buffer) {
        cachegetFloat64Memory0 = new Float64Array(wasm.memory.buffer);
    }
    return cachegetFloat64Memory0;
}

function dropObject(idx) {
    if (idx < 36) return;
    heap[idx] = heap_next;
    heap_next = idx;
}

function takeObject(idx) {
    const ret = getObject(idx);
    dropObject(idx);
    return ret;
}

function debugString(val) {
    // primitive types
    const type = typeof val;
    if (type == 'number' || type == 'boolean' || val == null) {
        return  `${val}`;
    }
    if (type == 'string') {
        return `"${val}"`;
    }
    if (type == 'symbol') {
        const description = val.description;
        if (description == null) {
            return 'Symbol';
        } else {
            return `Symbol(${description})`;
        }
    }
    if (type == 'function') {
        const name = val.name;
        if (typeof name == 'string' && name.length > 0) {
            return `Function(${name})`;
        } else {
            return 'Function';
        }
    }
    // objects
    if (Array.isArray(val)) {
        const length = val.length;
        let debug = '[';
        if (length > 0) {
            debug += debugString(val[0]);
        }
        for(let i = 1; i < length; i++) {
            debug += ', ' + debugString(val[i]);
        }
        debug += ']';
        return debug;
    }
    // Test for built-in
    const builtInMatches = /\[object ([^\]]+)\]/.exec(toString.call(val));
    let className;
    if (builtInMatches.length > 1) {
        className = builtInMatches[1];
    } else {
        // Failed to match the standard '[object ClassName]'
        return toString.call(val);
    }
    if (className == 'Object') {
        // we're a user defined class or Object
        // JSON.stringify avoids problems with cycles, and is generally much
        // easier than looping through ownProperties of `val`.
        try {
            return 'Object(' + JSON.stringify(val) + ')';
        } catch (_) {
            return 'Object';
        }
    }
    // errors
    if (val instanceof Error) {
        return `${val.name}: ${val.message}\n${val.stack}`;
    }
    // TODO we could test for more things here, like `Set`s and `Map`s.
    return className;
}
/**
* @param {string} p
* @param {any} options
* @returns {string}
*/
function str(p, options) {
  let ptr1, len1;
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        const ptr0 = passStringToWasm0(p, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        wasm.str(retptr, ptr0, len0, addHeapObject(options));
        const r0 = getInt32Memory0()[retptr / 4 + 0];
        const r1 = getInt32Memory0()[retptr / 4 + 1];
        const r2 = getInt32Memory0()[retptr / 4 + 2];
        const r3 = getInt32Memory0()[retptr / 4 + 3];
        ptr1 = r0;
        len1 = r1;
        if (r3) {
            ptr1 = 0; len1 = 0;
            throw takeObject(r2);
        }
        return getStringFromWasm0(ptr1, len1);
    } catch (e) {
        // topaz.log('grass', 'failed', e);
        console.error('grass failed to compile\n', e, { stdin: p, options });
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
        if (ptr1) wasm.__wbindgen_free(ptr1, len1);
    }
}

/**
* @returns {any}
*/
/* export function get_config() {
    const ret = wasm.get_config();
    return takeObject(ret);
} */

let stack_pointer = 32;

function addBorrowedObject(obj) {
    if (stack_pointer == 1) throw new Error('out of js stack');
    heap[--stack_pointer] = obj;
    return stack_pointer;
}
/**
* @param {string} path
* @param {any} jsconfig
* @returns {string}
*/
/* export function file(path, jsconfig) {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        const ptr0 = passStringToWasm0(path, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        wasm.file(retptr, ptr0, len0, addBorrowedObject(jsconfig));
        const r0 = getInt32Memory0()[retptr / 4 + 0];
        const r1 = getInt32Memory0()[retptr / 4 + 1];
        const r2 = getInt32Memory0()[retptr / 4 + 2];
        const r3 = getInt32Memory0()[retptr / 4 + 3];
        let ptr1 = r0;
        let len1 = r1;
        if (r3) {
            ptr1 = 0; len1 = 0;
            throw takeObject(r2);
        }
        return getStringFromWasm0(ptr1, len1);
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
        heap[stack_pointer++] = undefined;
        wasm.__wbindgen_free(ptr1, len1);
    }
} */

function handleError(f, args) {
    try {
        return f.apply(this, args);
    } catch (e) {
        wasm.__wbindgen_exn_store(addHeapObject(e));
    }
}

function getArrayU8FromWasm0(ptr, len) {
    return getUint8Memory0().subarray(ptr / 1, ptr / 1 + len);
}

const imports = {
    __wbindgen_placeholder__: {
        __wbindgen_string_new: function(arg0, arg1) {
            var ret = getStringFromWasm0(arg0, arg1);
            return addHeapObject(ret);
        },
        __wbindgen_string_get: function(arg0, arg1) {
            const obj = getObject(arg1);
            const ret = typeof(obj) === 'string' ? obj : undefined;
            const ptr0 = isLikeNone(ret) ? 0 : passStringToWasm0(ret, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
            const len0 = WASM_VECTOR_LEN;
            getInt32Memory0()[arg0 / 4 + 1] = len0;
            getInt32Memory0()[arg0 / 4 + 0] = ptr0;
        },
        __wbindgen_boolean_get: function(arg0) {
            const v = getObject(arg0);
            const ret = typeof(v) === 'boolean' ? (v ? 1 : 0) : 2;
            return ret;
        },
        __wbindgen_is_object: function(arg0) {
            const val = getObject(arg0);
            const ret = typeof(val) === 'object' && val !== null;
            return ret;
        },
        __wbg_jsreadfs_82f60869c0333697: function(arg0, arg1, arg2) {
            const ret = js_read_fs(getStringFromWasm0(arg1, arg2));
            const ptr0 = passStringToWasm0(ret, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
            const len0 = WASM_VECTOR_LEN;
            getInt32Memory0()[arg0 / 4 + 1] = len0;
            getInt32Memory0()[arg0 / 4 + 0] = ptr0;
        },
        __wbg_jsisfile_5c0a4b8a496e3cfe: function(arg0, arg1) {
            const ret = js_is_file(getStringFromWasm0(arg0, arg1));
            return ret;
        },
        __wbg_jsisdir_8b96007ac52fd047: function(arg0, arg1) {
            const ret = js_is_dir(getStringFromWasm0(arg0, arg1));
            return ret;
        },
        __wbindgen_json_parse: function(arg0, arg1) {
            const ret = JSON.parse(getStringFromWasm0(arg0, arg1));
            return addHeapObject(ret);
        },
        __wbindgen_json_serialize: function(arg0, arg1) {
            const obj = getObject(arg1);
            const ret = JSON.stringify(obj === undefined ? null : obj);
            const ptr0 = passStringToWasm0(ret, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
            const len0 = WASM_VECTOR_LEN;
            getInt32Memory0()[arg0 / 4 + 1] = len0;
            getInt32Memory0()[arg0 / 4 + 0] = ptr0;
        },
        __wbindgen_number_get: function(arg0, arg1) {
            const obj = getObject(arg1);
            const ret = typeof(obj) === 'number' ? obj : undefined;
            getFloat64Memory0()[arg0 / 8 + 1] = isLikeNone(ret) ? 0 : ret;
            getInt32Memory0()[arg0 / 4 + 0] = !isLikeNone(ret);
        },
        __wbindgen_is_null: function(arg0) {
            const ret = getObject(arg0) === null;
            return ret;
        },
        __wbindgen_is_undefined: function(arg0) {
            const ret = getObject(arg0) === undefined;
            return ret;
        },
        __wbindgen_object_clone_ref: function(arg0) {
            const ret = getObject(arg0);
            return addHeapObject(ret);
        },
        __wbg_get_f7833d6ec572e462: function(arg0, arg1) {
            const ret = getObject(arg0)[takeObject(arg1)];
            return addHeapObject(ret);
        },
        __wbg_msCrypto_c429c3f8f7a70bb5: function(arg0) {
            const ret = getObject(arg0).msCrypto;
            return addHeapObject(ret);
        },
        __wbg_crypto_9e3521ed42436d35: function(arg0) {
            const ret = getObject(arg0).crypto;
            return addHeapObject(ret);
        },
        __wbg_getRandomValues_3e46aa268da0fed1: function() { return handleError(function (arg0, arg1) {
            getObject(arg0).getRandomValues(getObject(arg1));
        }, arguments) },
        __wbg_modulerequire_0a83c0c31d12d2c7: function() { return handleError(function (arg0, arg1) {
            const ret = module.require(getStringFromWasm0(arg0, arg1));
            return addHeapObject(ret);
        }, arguments) },
        __wbg_randomFillSync_59fcc2add91fe7b3: function() { return handleError(function (arg0, arg1, arg2) {
            getObject(arg0).randomFillSync(getArrayU8FromWasm0(arg1, arg2));
        }, arguments) },
        __wbg_process_f2b73829dbd321da: function(arg0) {
            const ret = getObject(arg0).process;
            return addHeapObject(ret);
        },
        __wbg_versions_cd82f79c98672a9f: function(arg0) {
            const ret = getObject(arg0).versions;
            return addHeapObject(ret);
        },
        __wbg_node_ee3f6da4130bd35f: function(arg0) {
            const ret = getObject(arg0).node;
            return addHeapObject(ret);
        },
        __wbindgen_is_string: function(arg0) {
            const ret = typeof(getObject(arg0)) === 'string';
            return ret;
        },
        __wbg_isArray_8480ed76e5369634: function(arg0) {
            var ret = Array.isArray(getObject(arg0));
            return ret;
        },
        __wbg_instanceof_ArrayBuffer_649f53c967aec9b3: function(arg0) {
            var ret = getObject(arg0) instanceof ArrayBuffer;
            return ret;
        },
        __wbg_values_71935f80778b5113: function(arg0) {
            var ret = getObject(arg0).values();
            return addHeapObject(ret);
        },
        __wbg_new_55259b13834a484c: function(arg0, arg1) {
            var ret = new Error(getStringFromWasm0(arg0, arg1));
            return addHeapObject(ret);
        },
        __wbg_newnoargs_f579424187aa1717: function(arg0, arg1) {
            var ret = new Function(getStringFromWasm0(arg0, arg1));
            return addHeapObject(ret);
        },
        __wbg_call_89558c3e96703ca1: function() { return handleError(function (arg0, arg1) {
            var ret = getObject(arg0).call(getObject(arg1));
            return addHeapObject(ret);
        }, arguments) },
        __wbg_next_dd1a890d37e38d73: function() { return handleError(function (arg0) {
            var ret = getObject(arg0).next();
            return addHeapObject(ret);
        }, arguments) },
        __wbg_next_c7a2a6b012059a5e: function(arg0) {
            var ret = getObject(arg0).next;
            return addHeapObject(ret);
        },
        __wbg_done_982b1c7ac0cbc69d: function(arg0) {
            var ret = getObject(arg0).done;
            return ret;
        },
        __wbg_value_2def2d1fb38b02cd: function(arg0) {
            var ret = getObject(arg0).value;
            return addHeapObject(ret);
        },
        __wbg_iterator_4b9cedbeda0c0e30: function() {
            var ret = Symbol.iterator;
            return addHeapObject(ret);
        },
        __wbg_globalThis_d61b1f48a57191ae: function() { return handleError(function () {
            var ret = globalThis.globalThis;
            return addHeapObject(ret);
        }, arguments) },
        __wbg_self_e23d74ae45fb17d1: function() { return handleError(function () {
            var ret = self.self;
            return addHeapObject(ret);
        }, arguments) },
        __wbg_window_b4be7f48b24ac56e: function() { return handleError(function () {
            var ret = window.window;
            return addHeapObject(ret);
        }, arguments) },
        __wbg_global_e7669da72fd7f239: function() { return handleError(function () {
            var ret = global.global;
            return addHeapObject(ret);
        }, arguments) },
        __wbg_instanceof_Uint8Array_8a8537f46e056474: function(arg0) {
            var ret = getObject(arg0) instanceof Uint8Array;
            return ret;
        },
        __wbg_new_e3b800e570795b3c: function(arg0) {
            var ret = new Uint8Array(getObject(arg0));
            return addHeapObject(ret);
        },
        __wbg_newwithlength_5f4ce114a24dfe1e: function(arg0) {
            var ret = new Uint8Array(arg0 >>> 0);
            return addHeapObject(ret);
        },
        __wbg_subarray_a68f835ca2af506f: function(arg0, arg1, arg2) {
            var ret = getObject(arg0).subarray(arg1 >>> 0, arg2 >>> 0);
            return addHeapObject(ret);
        },
        __wbg_length_30803400a8f15c59: function(arg0) {
            var ret = getObject(arg0).length;
            return ret;
        },
        __wbg_set_5b8081e9d002f0df: function(arg0, arg1, arg2) {
            getObject(arg0).set(getObject(arg1), arg2 >>> 0);
        },
        __wbindgen_is_function: function(arg0) {
            var ret = typeof(getObject(arg0)) === 'function';
            return ret;
        },
        __wbindgen_object_drop_ref: function(arg0) {
            takeObject(arg0);
        },
        __wbg_buffer_5e74a88a1424a2e0: function(arg0) {
            var ret = getObject(arg0).buffer;
            return addHeapObject(ret);
        },
        __wbg_get_8bbb82393651dd9c: function() { return handleError(function (arg0, arg1) {
            var ret = Reflect.get(getObject(arg0), getObject(arg1));
            return addHeapObject(ret);
        }, arguments) },
        __wbindgen_debug_string: function(arg0, arg1) {
            var ret = debugString(getObject(arg1));
            var ptr0 = passStringToWasm0(ret, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
            var len0 = WASM_VECTOR_LEN;
            getInt32Memory0()[arg0 / 4 + 1] = len0;
            getInt32Memory0()[arg0 / 4 + 0] = ptr0;
        },
        __wbindgen_throw: function(arg0, arg1) {
            throw new Error(getStringFromWasm0(arg0, arg1));
        },
        __wbindgen_memory: function() {
            var ret = wasm.memory;
            return addHeapObject(ret);
        },
    },

};

let wasmCode = await (await fetch('http://localhost:1337/src/grass.wasm')).arrayBuffer();
const wasmInstance = (await WebAssembly.instantiate(wasmCode, imports)).instance;
const wasm = wasmInstance.exports;

return str;
})(); //# sourceURL=Grass