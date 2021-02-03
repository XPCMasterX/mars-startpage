
(function(l, r) { if (l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (window.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(window.document);
var app = (function () {
    'use strict';

    function noop() { }
    const identity = x => x;
    function add_location(element, file, line, column, char) {
        element.__svelte_meta = {
            loc: { file, line, column, char }
        };
    }
    function run(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }
    function is_empty(obj) {
        return Object.keys(obj).length === 0;
    }

    const is_client = typeof window !== 'undefined';
    let now = is_client
        ? () => window.performance.now()
        : () => Date.now();
    let raf = is_client ? cb => requestAnimationFrame(cb) : noop;

    const tasks = new Set();
    function run_tasks(now) {
        tasks.forEach(task => {
            if (!task.c(now)) {
                tasks.delete(task);
                task.f();
            }
        });
        if (tasks.size !== 0)
            raf(run_tasks);
    }
    /**
     * Creates a new task that runs on each raf frame
     * until it returns a falsy value or is aborted
     */
    function loop(callback) {
        let task;
        if (tasks.size === 0)
            raf(run_tasks);
        return {
            promise: new Promise(fulfill => {
                tasks.add(task = { c: callback, f: fulfill });
            }),
            abort() {
                tasks.delete(task);
            }
        };
    }

    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        node.parentNode.removeChild(node);
    }
    function element(name) {
        return document.createElement(name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function listen(node, event, handler, options) {
        node.addEventListener(event, handler, options);
        return () => node.removeEventListener(event, handler, options);
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function to_number(value) {
        return value === '' ? null : +value;
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function set_input_value(input, value) {
        input.value = value == null ? '' : value;
    }
    function set_style(node, key, value, important) {
        node.style.setProperty(key, value, important ? 'important' : '');
    }
    function custom_event(type, detail) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, false, false, detail);
        return e;
    }

    const active_docs = new Set();
    let active = 0;
    // https://github.com/darkskyapp/string-hash/blob/master/index.js
    function hash(str) {
        let hash = 5381;
        let i = str.length;
        while (i--)
            hash = ((hash << 5) - hash) ^ str.charCodeAt(i);
        return hash >>> 0;
    }
    function create_rule(node, a, b, duration, delay, ease, fn, uid = 0) {
        const step = 16.666 / duration;
        let keyframes = '{\n';
        for (let p = 0; p <= 1; p += step) {
            const t = a + (b - a) * ease(p);
            keyframes += p * 100 + `%{${fn(t, 1 - t)}}\n`;
        }
        const rule = keyframes + `100% {${fn(b, 1 - b)}}\n}`;
        const name = `__svelte_${hash(rule)}_${uid}`;
        const doc = node.ownerDocument;
        active_docs.add(doc);
        const stylesheet = doc.__svelte_stylesheet || (doc.__svelte_stylesheet = doc.head.appendChild(element('style')).sheet);
        const current_rules = doc.__svelte_rules || (doc.__svelte_rules = {});
        if (!current_rules[name]) {
            current_rules[name] = true;
            stylesheet.insertRule(`@keyframes ${name} ${rule}`, stylesheet.cssRules.length);
        }
        const animation = node.style.animation || '';
        node.style.animation = `${animation ? `${animation}, ` : ''}${name} ${duration}ms linear ${delay}ms 1 both`;
        active += 1;
        return name;
    }
    function delete_rule(node, name) {
        const previous = (node.style.animation || '').split(', ');
        const next = previous.filter(name
            ? anim => anim.indexOf(name) < 0 // remove specific animation
            : anim => anim.indexOf('__svelte') === -1 // remove all Svelte animations
        );
        const deleted = previous.length - next.length;
        if (deleted) {
            node.style.animation = next.join(', ');
            active -= deleted;
            if (!active)
                clear_rules();
        }
    }
    function clear_rules() {
        raf(() => {
            if (active)
                return;
            active_docs.forEach(doc => {
                const stylesheet = doc.__svelte_stylesheet;
                let i = stylesheet.cssRules.length;
                while (i--)
                    stylesheet.deleteRule(i);
                doc.__svelte_rules = {};
            });
            active_docs.clear();
        });
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }
    function get_current_component() {
        if (!current_component)
            throw new Error('Function called outside component initialization');
        return current_component;
    }
    function onMount(fn) {
        get_current_component().$$.on_mount.push(fn);
    }

    const dirty_components = [];
    const binding_callbacks = [];
    const render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    function add_flush_callback(fn) {
        flush_callbacks.push(fn);
    }
    let flushing = false;
    const seen_callbacks = new Set();
    function flush() {
        if (flushing)
            return;
        flushing = true;
        do {
            // first, call beforeUpdate functions
            // and update components
            for (let i = 0; i < dirty_components.length; i += 1) {
                const component = dirty_components[i];
                set_current_component(component);
                update(component.$$);
            }
            set_current_component(null);
            dirty_components.length = 0;
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                    callback();
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
        flushing = false;
        seen_callbacks.clear();
    }
    function update($$) {
        if ($$.fragment !== null) {
            $$.update();
            run_all($$.before_update);
            const dirty = $$.dirty;
            $$.dirty = [-1];
            $$.fragment && $$.fragment.p($$.ctx, dirty);
            $$.after_update.forEach(add_render_callback);
        }
    }

    let promise;
    function wait() {
        if (!promise) {
            promise = Promise.resolve();
            promise.then(() => {
                promise = null;
            });
        }
        return promise;
    }
    function dispatch(node, direction, kind) {
        node.dispatchEvent(custom_event(`${direction ? 'intro' : 'outro'}${kind}`));
    }
    const outroing = new Set();
    let outros;
    function group_outros() {
        outros = {
            r: 0,
            c: [],
            p: outros // parent group
        };
    }
    function check_outros() {
        if (!outros.r) {
            run_all(outros.c);
        }
        outros = outros.p;
    }
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }
    function transition_out(block, local, detach, callback) {
        if (block && block.o) {
            if (outroing.has(block))
                return;
            outroing.add(block);
            outros.c.push(() => {
                outroing.delete(block);
                if (callback) {
                    if (detach)
                        block.d(1);
                    callback();
                }
            });
            block.o(local);
        }
    }
    const null_transition = { duration: 0 };
    function create_bidirectional_transition(node, fn, params, intro) {
        let config = fn(node, params);
        let t = intro ? 0 : 1;
        let running_program = null;
        let pending_program = null;
        let animation_name = null;
        function clear_animation() {
            if (animation_name)
                delete_rule(node, animation_name);
        }
        function init(program, duration) {
            const d = program.b - t;
            duration *= Math.abs(d);
            return {
                a: t,
                b: program.b,
                d,
                duration,
                start: program.start,
                end: program.start + duration,
                group: program.group
            };
        }
        function go(b) {
            const { delay = 0, duration = 300, easing = identity, tick = noop, css } = config || null_transition;
            const program = {
                start: now() + delay,
                b
            };
            if (!b) {
                // @ts-ignore todo: improve typings
                program.group = outros;
                outros.r += 1;
            }
            if (running_program || pending_program) {
                pending_program = program;
            }
            else {
                // if this is an intro, and there's a delay, we need to do
                // an initial tick and/or apply CSS animation immediately
                if (css) {
                    clear_animation();
                    animation_name = create_rule(node, t, b, duration, delay, easing, css);
                }
                if (b)
                    tick(0, 1);
                running_program = init(program, duration);
                add_render_callback(() => dispatch(node, b, 'start'));
                loop(now => {
                    if (pending_program && now > pending_program.start) {
                        running_program = init(pending_program, duration);
                        pending_program = null;
                        dispatch(node, running_program.b, 'start');
                        if (css) {
                            clear_animation();
                            animation_name = create_rule(node, t, running_program.b, running_program.duration, 0, easing, config.css);
                        }
                    }
                    if (running_program) {
                        if (now >= running_program.end) {
                            tick(t = running_program.b, 1 - t);
                            dispatch(node, running_program.b, 'end');
                            if (!pending_program) {
                                // we're done
                                if (running_program.b) {
                                    // intro — we can tidy up immediately
                                    clear_animation();
                                }
                                else {
                                    // outro — needs to be coordinated
                                    if (!--running_program.group.r)
                                        run_all(running_program.group.c);
                                }
                            }
                            running_program = null;
                        }
                        else if (now >= running_program.start) {
                            const p = now - running_program.start;
                            t = running_program.a + running_program.d * easing(p / running_program.duration);
                            tick(t, 1 - t);
                        }
                    }
                    return !!(running_program || pending_program);
                });
            }
        }
        return {
            run(b) {
                if (is_function(config)) {
                    wait().then(() => {
                        // @ts-ignore
                        config = config();
                        go(b);
                    });
                }
                else {
                    go(b);
                }
            },
            end() {
                clear_animation();
                running_program = pending_program = null;
            }
        };
    }

    const globals = (typeof window !== 'undefined'
        ? window
        : typeof globalThis !== 'undefined'
            ? globalThis
            : global);

    function bind(component, name, callback) {
        const index = component.$$.props[name];
        if (index !== undefined) {
            component.$$.bound[index] = callback;
            callback(component.$$.ctx[index]);
        }
    }
    function create_component(block) {
        block && block.c();
    }
    function mount_component(component, target, anchor) {
        const { fragment, on_mount, on_destroy, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        // onMount happens before the initial afterUpdate
        add_render_callback(() => {
            const new_on_destroy = on_mount.map(run).filter(is_function);
            if (on_destroy) {
                on_destroy.push(...new_on_destroy);
            }
            else {
                // Edge case - component was destroyed immediately,
                // most likely as a result of a binding initialising
                run_all(new_on_destroy);
            }
            component.$$.on_mount = [];
        });
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        const $$ = component.$$;
        if ($$.fragment !== null) {
            run_all($$.on_destroy);
            $$.fragment && $$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            $$.on_destroy = $$.fragment = null;
            $$.ctx = [];
        }
    }
    function make_dirty(component, i) {
        if (component.$$.dirty[0] === -1) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty.fill(0);
        }
        component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
    }
    function init(component, options, instance, create_fragment, not_equal, props, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const $$ = component.$$ = {
            fragment: null,
            ctx: null,
            // state
            props,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            before_update: [],
            after_update: [],
            context: new Map(parent_component ? parent_component.$$.context : []),
            // everything else
            callbacks: blank_object(),
            dirty,
            skip_bound: false
        };
        let ready = false;
        $$.ctx = instance
            ? instance(component, options.props || {}, (i, ret, ...rest) => {
                const value = rest.length ? rest[0] : ret;
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if (!$$.skip_bound && $$.bound[i])
                        $$.bound[i](value);
                    if (ready)
                        make_dirty(component, i);
                }
                return ret;
            })
            : [];
        $$.update();
        ready = true;
        run_all($$.before_update);
        // `false` as a special case of no DOM component
        $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
        if (options.target) {
            if (options.hydrate) {
                const nodes = children(options.target);
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.l(nodes);
                nodes.forEach(detach);
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor);
            flush();
        }
        set_current_component(parent_component);
    }
    /**
     * Base class for Svelte components. Used when dev=false.
     */
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set($$props) {
            if (this.$$set && !is_empty($$props)) {
                this.$$.skip_bound = true;
                this.$$set($$props);
                this.$$.skip_bound = false;
            }
        }
    }

    function dispatch_dev(type, detail) {
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.32.1' }, detail)));
    }
    function append_dev(target, node) {
        dispatch_dev('SvelteDOMInsert', { target, node });
        append(target, node);
    }
    function insert_dev(target, node, anchor) {
        dispatch_dev('SvelteDOMInsert', { target, node, anchor });
        insert(target, node, anchor);
    }
    function detach_dev(node) {
        dispatch_dev('SvelteDOMRemove', { node });
        detach(node);
    }
    function listen_dev(node, event, handler, options, has_prevent_default, has_stop_propagation) {
        const modifiers = options === true ? ['capture'] : options ? Array.from(Object.keys(options)) : [];
        if (has_prevent_default)
            modifiers.push('preventDefault');
        if (has_stop_propagation)
            modifiers.push('stopPropagation');
        dispatch_dev('SvelteDOMAddEventListener', { node, event, handler, modifiers });
        const dispose = listen(node, event, handler, options);
        return () => {
            dispatch_dev('SvelteDOMRemoveEventListener', { node, event, handler, modifiers });
            dispose();
        };
    }
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev('SvelteDOMRemoveAttribute', { node, attribute });
        else
            dispatch_dev('SvelteDOMSetAttribute', { node, attribute, value });
    }
    function set_data_dev(text, data) {
        data = '' + data;
        if (text.wholeText === data)
            return;
        dispatch_dev('SvelteDOMSetData', { node: text, data });
        text.data = data;
    }
    function validate_slots(name, slot, keys) {
        for (const slot_key of Object.keys(slot)) {
            if (!~keys.indexOf(slot_key)) {
                console.warn(`<${name}> received an unexpected slot "${slot_key}".`);
            }
        }
    }
    /**
     * Base class for Svelte components with some minor dev-enhancements. Used when dev=true.
     */
    class SvelteComponentDev extends SvelteComponent {
        constructor(options) {
            if (!options || (!options.target && !options.$$inline)) {
                throw new Error("'target' is a required option");
            }
            super();
        }
        $destroy() {
            super.$destroy();
            this.$destroy = () => {
                console.warn('Component was already destroyed'); // eslint-disable-line no-console
            };
        }
        $capture_state() { }
        $inject_state() { }
    }

    var data = { name:"Varshith",
      greeting:"Hello *!",
      nameConstant:"*",
      searchEngine:"Google",
      css:{ "gradient-start":"#2600ff",
        "gradient-end":"#00ff26",
        "text-font-size":"150px",
        "search-background-color":"#181b1e",
        "blur-strength":"25px" } };

    function cubicOut(t) {
        const f = t - 1.0;
        return f * f * f + 1.0;
    }

    function fly(node, { delay = 0, duration = 400, easing = cubicOut, x = 0, y = 0, opacity = 0 } = {}) {
        const style = getComputedStyle(node);
        const target_opacity = +style.opacity;
        const transform = style.transform === 'none' ? '' : style.transform;
        const od = target_opacity * (1 - opacity);
        return {
            delay,
            duration,
            easing,
            css: (t, u) => `
			transform: ${transform} translate(${(1 - t) * x}px, ${(1 - t) * y}px);
			opacity: ${target_opacity - (od * u)}`
        };
    }

    /* src\lib\Options.svelte generated by Svelte v3.32.1 */

    const { console: console_1 } = globals;
    const file = "src\\lib\\Options.svelte";

    function create_fragment(ctx) {
    	let div11;
    	let div8;
    	let div7;
    	let p0;
    	let strong;
    	let t1;
    	let div0;
    	let p1;
    	let t3;
    	let input0;
    	let t4;
    	let div1;
    	let p2;
    	let t5;
    	let br0;
    	let t6;
    	let t7;
    	let div2;
    	let p3;
    	let t9;
    	let input1;
    	let t10;
    	let div3;
    	let p4;
    	let t11;
    	let br1;
    	let t12;
    	let t13;
    	let div4;
    	let p5;
    	let t15;
    	let input2;
    	let t16;
    	let div5;
    	let p6;
    	let t17;
    	let br2;
    	let t18;
    	let br3;
    	let t19;
    	let t20;
    	let div6;
    	let p7;
    	let t22;
    	let input3;
    	let t23;
    	let div10;
    	let div9;
    	let p8;
    	let t25;
    	let input4;
    	let div11_transition;
    	let current;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			div11 = element("div");
    			div8 = element("div");
    			div7 = element("div");
    			p0 = element("p");
    			strong = element("strong");
    			strong.textContent = "General";
    			t1 = space();
    			div0 = element("div");
    			p1 = element("p");
    			p1.textContent = "Name:";
    			t3 = space();
    			input0 = element("input");
    			t4 = space();
    			div1 = element("div");
    			p2 = element("p");
    			t5 = text("* is replaced by name, and there can only be one * ");
    			br0 = element("br");
    			t6 = text("\r\n                    Also, if greeting is too big for your screen, you can change\r\n                    it in the CSS.");
    			t7 = space();
    			div2 = element("div");
    			p3 = element("p");
    			p3.textContent = "Greeting:";
    			t9 = space();
    			input1 = element("input");
    			t10 = space();
    			div3 = element("div");
    			p4 = element("p");
    			t11 = text("If you don't want to use * you can change that too, but you\r\n                    need to ");
    			br1 = element("br");
    			t12 = text("\r\n                    use this instead of * in welcome");
    			t13 = space();
    			div4 = element("div");
    			p5 = element("p");
    			p5.textContent = "Name Constant:";
    			t15 = space();
    			input2 = element("input");
    			t16 = space();
    			div5 = element("div");
    			p6 = element("p");
    			t17 = text("If you want to use a different search engine, specify it\r\n                    here ");
    			br2 = element("br");
    			t18 = text("\r\n                    Options: DuckDuckGo, Google and Bing. ");
    			br3 = element("br");
    			t19 = text("\r\n                    You can use a custom url, usually its https://(Search Engine\r\n                    Name (lowercase)).com/search");
    			t20 = space();
    			div6 = element("div");
    			p7 = element("p");
    			p7.textContent = "Search Engine:";
    			t22 = space();
    			input3 = element("input");
    			t23 = space();
    			div10 = element("div");
    			div9 = element("div");
    			p8 = element("p");
    			p8.textContent = "Blur Strength:";
    			t25 = space();
    			input4 = element("input");
    			add_location(strong, file, 15, 15, 470);
    			add_location(p0, file, 15, 12, 467);
    			attr_dev(p1, "for", "name");
    			attr_dev(p1, "id", "name");
    			attr_dev(p1, "class", "svelte-a4t92h");
    			add_location(p1, file, 17, 16, 548);
    			attr_dev(input0, "type", "text");
    			attr_dev(input0, "name", "name");
    			attr_dev(input0, "id", "nameBox");
    			attr_dev(input0, "class", "svelte-a4t92h");
    			add_location(input0, file, 18, 16, 599);
    			attr_dev(div0, "class", "name");
    			add_location(div0, file, 16, 12, 512);
    			add_location(br0, file, 22, 71, 796);
    			add_location(p2, file, 21, 16, 720);
    			add_location(div1, file, 20, 12, 697);
    			attr_dev(p3, "for", "name");
    			attr_dev(p3, "id", "name");
    			attr_dev(p3, "class", "svelte-a4t92h");
    			add_location(p3, file, 28, 16, 1012);
    			attr_dev(input1, "type", "text");
    			attr_dev(input1, "name", "name");
    			attr_dev(input1, "id", "nameBox");
    			attr_dev(input1, "class", "svelte-a4t92h");
    			add_location(input1, file, 29, 16, 1067);
    			attr_dev(div2, "class", "name");
    			add_location(div2, file, 27, 12, 976);
    			add_location(br1, file, 39, 28, 1407);
    			add_location(p4, file, 37, 16, 1293);
    			add_location(div3, file, 36, 12, 1270);
    			attr_dev(p5, "for", "name");
    			attr_dev(p5, "id", "name");
    			attr_dev(p5, "class", "svelte-a4t92h");
    			add_location(p5, file, 44, 16, 1559);
    			attr_dev(input2, "type", "text");
    			attr_dev(input2, "name", "name");
    			attr_dev(input2, "id", "nameConstant");
    			attr_dev(input2, "class", "svelte-a4t92h");
    			add_location(input2, file, 45, 16, 1619);
    			attr_dev(div4, "class", "name");
    			add_location(div4, file, 43, 12, 1523);
    			add_location(br2, file, 55, 25, 1962);
    			add_location(br3, file, 56, 58, 2028);
    			add_location(p6, file, 53, 16, 1854);
    			add_location(div5, file, 52, 12, 1831);
    			attr_dev(p7, "for", "name");
    			attr_dev(p7, "id", "name");
    			attr_dev(p7, "class", "svelte-a4t92h");
    			add_location(p7, file, 62, 16, 2258);
    			attr_dev(input3, "type", "text");
    			attr_dev(input3, "name", "name");
    			attr_dev(input3, "id", "nameConstant");
    			set_style(input3, "width", "7vw", 1);
    			attr_dev(input3, "class", "svelte-a4t92h");
    			add_location(input3, file, 63, 16, 2318);
    			attr_dev(div6, "class", "name");
    			add_location(div6, file, 61, 12, 2222);
    			attr_dev(div7, "class", "general svelte-a4t92h");
    			add_location(div7, file, 14, 8, 432);
    			attr_dev(div8, "class", "option generalProportions svelte-a4t92h");
    			add_location(div8, file, 13, 4, 383);
    			attr_dev(p8, "for", "blurStrength");
    			attr_dev(p8, "id", "blurStrengthLabel");
    			attr_dev(p8, "class", "svelte-a4t92h");
    			add_location(p8, file, 75, 12, 2679);
    			attr_dev(input4, "type", "range");
    			attr_dev(input4, "min", "1");
    			attr_dev(input4, "max", "100");
    			attr_dev(input4, "id", "blurStrength");
    			attr_dev(input4, "class", "svelte-a4t92h");
    			add_location(input4, file, 76, 12, 2756);
    			attr_dev(div9, "class", "blur svelte-a4t92h");
    			add_location(div9, file, 74, 8, 2647);
    			attr_dev(div10, "class", "option blurProportions svelte-a4t92h");
    			add_location(div10, file, 73, 4, 2601);
    			attr_dev(div11, "class", "option-container svelte-a4t92h");
    			add_location(div11, file, 12, 0, 306);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div11, anchor);
    			append_dev(div11, div8);
    			append_dev(div8, div7);
    			append_dev(div7, p0);
    			append_dev(p0, strong);
    			append_dev(div7, t1);
    			append_dev(div7, div0);
    			append_dev(div0, p1);
    			append_dev(div0, t3);
    			append_dev(div0, input0);
    			set_input_value(input0, /*name*/ ctx[0]);
    			append_dev(div7, t4);
    			append_dev(div7, div1);
    			append_dev(div1, p2);
    			append_dev(p2, t5);
    			append_dev(p2, br0);
    			append_dev(p2, t6);
    			append_dev(div7, t7);
    			append_dev(div7, div2);
    			append_dev(div2, p3);
    			append_dev(div2, t9);
    			append_dev(div2, input1);
    			set_input_value(input1, /*greeting*/ ctx[1]);
    			append_dev(div7, t10);
    			append_dev(div7, div3);
    			append_dev(div3, p4);
    			append_dev(p4, t11);
    			append_dev(p4, br1);
    			append_dev(p4, t12);
    			append_dev(div7, t13);
    			append_dev(div7, div4);
    			append_dev(div4, p5);
    			append_dev(div4, t15);
    			append_dev(div4, input2);
    			set_input_value(input2, /*nameConstant*/ ctx[2]);
    			append_dev(div7, t16);
    			append_dev(div7, div5);
    			append_dev(div5, p6);
    			append_dev(p6, t17);
    			append_dev(p6, br2);
    			append_dev(p6, t18);
    			append_dev(p6, br3);
    			append_dev(p6, t19);
    			append_dev(div7, t20);
    			append_dev(div7, div6);
    			append_dev(div6, p7);
    			append_dev(div6, t22);
    			append_dev(div6, input3);
    			set_input_value(input3, /*searchEngine*/ ctx[3]);
    			append_dev(div11, t23);
    			append_dev(div11, div10);
    			append_dev(div10, div9);
    			append_dev(div9, p8);
    			append_dev(div9, t25);
    			append_dev(div9, input4);
    			set_input_value(input4, /*blurSlider*/ ctx[4]);
    			current = true;

    			if (!mounted) {
    				dispose = [
    					listen_dev(input0, "input", /*input0_input_handler*/ ctx[5]),
    					listen_dev(input1, "input", /*input1_input_handler*/ ctx[6]),
    					listen_dev(input2, "input", /*input2_input_handler*/ ctx[7]),
    					listen_dev(input3, "input", /*input3_input_handler*/ ctx[8]),
    					listen_dev(input4, "change", /*input4_change_input_handler*/ ctx[9]),
    					listen_dev(input4, "input", /*input4_change_input_handler*/ ctx[9])
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*name*/ 1 && input0.value !== /*name*/ ctx[0]) {
    				set_input_value(input0, /*name*/ ctx[0]);
    			}

    			if (dirty & /*greeting*/ 2 && input1.value !== /*greeting*/ ctx[1]) {
    				set_input_value(input1, /*greeting*/ ctx[1]);
    			}

    			if (dirty & /*nameConstant*/ 4 && input2.value !== /*nameConstant*/ ctx[2]) {
    				set_input_value(input2, /*nameConstant*/ ctx[2]);
    			}

    			if (dirty & /*searchEngine*/ 8 && input3.value !== /*searchEngine*/ ctx[3]) {
    				set_input_value(input3, /*searchEngine*/ ctx[3]);
    			}

    			if (dirty & /*blurSlider*/ 16) {
    				set_input_value(input4, /*blurSlider*/ ctx[4]);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;

    			add_render_callback(() => {
    				if (!div11_transition) div11_transition = create_bidirectional_transition(div11, fly, { x: -350, opacity: 1 }, true);
    				div11_transition.run(1);
    			});

    			current = true;
    		},
    		o: function outro(local) {
    			if (!div11_transition) div11_transition = create_bidirectional_transition(div11, fly, { x: -350, opacity: 1 }, false);
    			div11_transition.run(0);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div11);
    			if (detaching && div11_transition) div11_transition.end();
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("Options", slots, []);
    	let blurSlider = 25;
    	let root = document.documentElement;

    	let { name } = $$props,
    		{ greeting } = $$props,
    		{ nameConstant } = $$props,
    		{ searchEngine } = $$props;

    	const writable_props = ["name", "greeting", "nameConstant", "searchEngine"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console_1.warn(`<Options> was created with unknown prop '${key}'`);
    	});

    	function input0_input_handler() {
    		name = this.value;
    		$$invalidate(0, name);
    	}

    	function input1_input_handler() {
    		greeting = this.value;
    		$$invalidate(1, greeting);
    	}

    	function input2_input_handler() {
    		nameConstant = this.value;
    		$$invalidate(2, nameConstant);
    	}

    	function input3_input_handler() {
    		searchEngine = this.value;
    		$$invalidate(3, searchEngine);
    	}

    	function input4_change_input_handler() {
    		blurSlider = to_number(this.value);
    		$$invalidate(4, blurSlider);
    	}

    	$$self.$$set = $$props => {
    		if ("name" in $$props) $$invalidate(0, name = $$props.name);
    		if ("greeting" in $$props) $$invalidate(1, greeting = $$props.greeting);
    		if ("nameConstant" in $$props) $$invalidate(2, nameConstant = $$props.nameConstant);
    		if ("searchEngine" in $$props) $$invalidate(3, searchEngine = $$props.searchEngine);
    	};

    	$$self.$capture_state = () => ({
    		fly,
    		blurSlider,
    		root,
    		name,
    		greeting,
    		nameConstant,
    		searchEngine
    	});

    	$$self.$inject_state = $$props => {
    		if ("blurSlider" in $$props) $$invalidate(4, blurSlider = $$props.blurSlider);
    		if ("root" in $$props) $$invalidate(10, root = $$props.root);
    		if ("name" in $$props) $$invalidate(0, name = $$props.name);
    		if ("greeting" in $$props) $$invalidate(1, greeting = $$props.greeting);
    		if ("nameConstant" in $$props) $$invalidate(2, nameConstant = $$props.nameConstant);
    		if ("searchEngine" in $$props) $$invalidate(3, searchEngine = $$props.searchEngine);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*blurSlider*/ 16) {
    			 root.style.setProperty("--blur-strength", blurSlider + "px");
    		}

    		if ($$self.$$.dirty & /*blurSlider*/ 16) {
    			 console.log(blurSlider);
    		}
    	};

    	return [
    		name,
    		greeting,
    		nameConstant,
    		searchEngine,
    		blurSlider,
    		input0_input_handler,
    		input1_input_handler,
    		input2_input_handler,
    		input3_input_handler,
    		input4_change_input_handler
    	];
    }

    class Options extends SvelteComponentDev {
    	constructor(options) {
    		super(options);

    		init(this, options, instance, create_fragment, safe_not_equal, {
    			name: 0,
    			greeting: 1,
    			nameConstant: 2,
    			searchEngine: 3
    		});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Options",
    			options,
    			id: create_fragment.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*name*/ ctx[0] === undefined && !("name" in props)) {
    			console_1.warn("<Options> was created without expected prop 'name'");
    		}

    		if (/*greeting*/ ctx[1] === undefined && !("greeting" in props)) {
    			console_1.warn("<Options> was created without expected prop 'greeting'");
    		}

    		if (/*nameConstant*/ ctx[2] === undefined && !("nameConstant" in props)) {
    			console_1.warn("<Options> was created without expected prop 'nameConstant'");
    		}

    		if (/*searchEngine*/ ctx[3] === undefined && !("searchEngine" in props)) {
    			console_1.warn("<Options> was created without expected prop 'searchEngine'");
    		}
    	}

    	get name() {
    		throw new Error("<Options>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set name(value) {
    		throw new Error("<Options>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get greeting() {
    		throw new Error("<Options>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set greeting(value) {
    		throw new Error("<Options>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get nameConstant() {
    		throw new Error("<Options>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set nameConstant(value) {
    		throw new Error("<Options>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get searchEngine() {
    		throw new Error("<Options>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set searchEngine(value) {
    		throw new Error("<Options>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src\App.svelte generated by Svelte v3.32.1 */

    const { Object: Object_1 } = globals;
    const file$1 = "src\\App.svelte";

    // (73:0) {#if visible}
    function create_if_block(ctx) {
    	let options;
    	let updating_name;
    	let updating_greeting;
    	let updating_nameConstant;
    	let updating_searchEngine;
    	let current;

    	function options_name_binding(value) {
    		/*options_name_binding*/ ctx[8].call(null, value);
    	}

    	function options_greeting_binding(value) {
    		/*options_greeting_binding*/ ctx[9].call(null, value);
    	}

    	function options_nameConstant_binding(value) {
    		/*options_nameConstant_binding*/ ctx[10].call(null, value);
    	}

    	function options_searchEngine_binding(value) {
    		/*options_searchEngine_binding*/ ctx[11].call(null, value);
    	}

    	let options_props = {};

    	if (/*name*/ ctx[0] !== void 0) {
    		options_props.name = /*name*/ ctx[0];
    	}

    	if (/*greeting*/ ctx[1] !== void 0) {
    		options_props.greeting = /*greeting*/ ctx[1];
    	}

    	if (/*nameConstant*/ ctx[2] !== void 0) {
    		options_props.nameConstant = /*nameConstant*/ ctx[2];
    	}

    	if (/*searchEngine*/ ctx[3] !== void 0) {
    		options_props.searchEngine = /*searchEngine*/ ctx[3];
    	}

    	options = new Options({ props: options_props, $$inline: true });
    	binding_callbacks.push(() => bind(options, "name", options_name_binding));
    	binding_callbacks.push(() => bind(options, "greeting", options_greeting_binding));
    	binding_callbacks.push(() => bind(options, "nameConstant", options_nameConstant_binding));
    	binding_callbacks.push(() => bind(options, "searchEngine", options_searchEngine_binding));

    	const block = {
    		c: function create() {
    			create_component(options.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(options, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const options_changes = {};

    			if (!updating_name && dirty & /*name*/ 1) {
    				updating_name = true;
    				options_changes.name = /*name*/ ctx[0];
    				add_flush_callback(() => updating_name = false);
    			}

    			if (!updating_greeting && dirty & /*greeting*/ 2) {
    				updating_greeting = true;
    				options_changes.greeting = /*greeting*/ ctx[1];
    				add_flush_callback(() => updating_greeting = false);
    			}

    			if (!updating_nameConstant && dirty & /*nameConstant*/ 4) {
    				updating_nameConstant = true;
    				options_changes.nameConstant = /*nameConstant*/ ctx[2];
    				add_flush_callback(() => updating_nameConstant = false);
    			}

    			if (!updating_searchEngine && dirty & /*searchEngine*/ 8) {
    				updating_searchEngine = true;
    				options_changes.searchEngine = /*searchEngine*/ ctx[3];
    				add_flush_callback(() => updating_searchEngine = false);
    			}

    			options.$set(options_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(options.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(options.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(options, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block.name,
    		type: "if",
    		source: "(73:0) {#if visible}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$1(ctx) {
    	let div2;
    	let p;
    	let t0_value = /*evalWelcome*/ ctx[6](/*config*/ ctx[4].greeting, /*config*/ ctx[4].nameConstant) + "";
    	let t0;
    	let t1;
    	let form;
    	let input0;
    	let t2;
    	let div1;
    	let div0;
    	let input1;
    	let form_action_value;
    	let t3;
    	let t4;
    	let div3;
    	let img;
    	let img_src_value;
    	let t5;
    	let div4;
    	let current;
    	let mounted;
    	let dispose;
    	let if_block = /*visible*/ ctx[5] && create_if_block(ctx);

    	const block = {
    		c: function create() {
    			div2 = element("div");
    			p = element("p");
    			t0 = text(t0_value);
    			t1 = space();
    			form = element("form");
    			input0 = element("input");
    			t2 = space();
    			div1 = element("div");
    			div0 = element("div");
    			input1 = element("input");
    			t3 = space();
    			if (if_block) if_block.c();
    			t4 = space();
    			div3 = element("div");
    			img = element("img");
    			t5 = space();
    			div4 = element("div");
    			attr_dev(p, "class", "svelte-c7zfmv");
    			add_location(p, file$1, 62, 4, 1829);
    			attr_dev(input0, "type", "hidden");
    			attr_dev(input0, "name", "sitesearch");
    			add_location(input0, file$1, 64, 8, 1969);
    			attr_dev(input1, "type", "text");
    			attr_dev(input1, "name", "q");
    			attr_dev(input1, "id", "search");
    			attr_dev(input1, "class", "svelte-c7zfmv");
    			add_location(input1, file$1, 67, 16, 2103);
    			attr_dev(div0, "class", "search-bar-wrap svelte-c7zfmv");
    			add_location(div0, file$1, 66, 12, 2056);
    			attr_dev(div1, "id", "search-area");
    			attr_dev(div1, "class", "svelte-c7zfmv");
    			add_location(div1, file$1, 65, 8, 2020);
    			attr_dev(form, "action", form_action_value = evalSearchEngine(/*config*/ ctx[4].searchEngine));
    			attr_dev(form, "method", "get");
    			attr_dev(form, "class", "svelte-c7zfmv");
    			add_location(form, file$1, 63, 4, 1893);
    			attr_dev(div2, "class", "svelte-c7zfmv");
    			add_location(div2, file$1, 61, 0, 1818);
    			if (img.src !== (img_src_value = "./settings.svg")) attr_dev(img, "src", img_src_value);
    			attr_dev(img, "alt", "Settings");
    			attr_dev(img, "class", "svelte-c7zfmv");
    			add_location(img, file$1, 78, 4, 2385);
    			attr_dev(div3, "class", "settings svelte-c7zfmv");
    			add_location(div3, file$1, 77, 0, 2357);
    			attr_dev(div4, "class", "blur svelte-c7zfmv");
    			add_location(div4, file$1, 81, 0, 2465);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div2, anchor);
    			append_dev(div2, p);
    			append_dev(p, t0);
    			append_dev(div2, t1);
    			append_dev(div2, form);
    			append_dev(form, input0);
    			append_dev(form, t2);
    			append_dev(form, div1);
    			append_dev(div1, div0);
    			append_dev(div0, input1);
    			insert_dev(target, t3, anchor);
    			if (if_block) if_block.m(target, anchor);
    			insert_dev(target, t4, anchor);
    			insert_dev(target, div3, anchor);
    			append_dev(div3, img);
    			insert_dev(target, t5, anchor);
    			insert_dev(target, div4, anchor);
    			current = true;

    			if (!mounted) {
    				dispose = listen_dev(img, "click", /*toggleVisible*/ ctx[7], false, false, false);
    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if ((!current || dirty & /*config*/ 16) && t0_value !== (t0_value = /*evalWelcome*/ ctx[6](/*config*/ ctx[4].greeting, /*config*/ ctx[4].nameConstant) + "")) set_data_dev(t0, t0_value);

    			if (!current || dirty & /*config*/ 16 && form_action_value !== (form_action_value = evalSearchEngine(/*config*/ ctx[4].searchEngine))) {
    				attr_dev(form, "action", form_action_value);
    			}

    			if (/*visible*/ ctx[5]) {
    				if (if_block) {
    					if_block.p(ctx, dirty);

    					if (dirty & /*visible*/ 32) {
    						transition_in(if_block, 1);
    					}
    				} else {
    					if_block = create_if_block(ctx);
    					if_block.c();
    					transition_in(if_block, 1);
    					if_block.m(t4.parentNode, t4);
    				}
    			} else if (if_block) {
    				group_outros();

    				transition_out(if_block, 1, 1, () => {
    					if_block = null;
    				});

    				check_outros();
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(if_block);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div2);
    			if (detaching) detach_dev(t3);
    			if (if_block) if_block.d(detaching);
    			if (detaching) detach_dev(t4);
    			if (detaching) detach_dev(div3);
    			if (detaching) detach_dev(t5);
    			if (detaching) detach_dev(div4);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$1.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function evalSearchEngine(searchEngine) {
    	switch (searchEngine) {
    		case "DuckDuckGo":
    			return "https://duckduckgo.com/search";
    		case "Google":
    			return "https://google.com/search";
    		case "Bing":
    			return "https://bing.com/search";
    		default:
    			return searchEngine;
    	}
    }

    function instance$1($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("App", slots, []);
    	let config = JSON.parse(JSON.stringify(data));
    	let visible = false;

    	function evalWelcome(string, nameConstant) {
    		return string.replace(nameConstant, config.name);
    	}

    	function loadCSSOptions() {
    		let root = document.documentElement;
    		let cssProperties = Object.entries(config.css);

    		for (const [key, value] of cssProperties) {
    			root.style.setProperty("--" + key, value.toString());
    		}
    	}

    	function toggleVisible() {
    		$$invalidate(5, visible = visible === true ? false : true);
    	}

    	onMount(async () => {
    		loadCSSOptions();
    		document.body.style["background-image"] = "url(./background.jpg)";
    	});

    	/* Assign config.name to name first so it doesn't say undefined and any 
    		further changes will be updated live.
    		Also autofills the textbox
    	*/
    	let name = config.name,
    		greeting = config.greeting,
    		nameConstant = config.nameConstant,
    		searchEngine = config.searchEngine;

    	const writable_props = [];

    	Object_1.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	function options_name_binding(value) {
    		name = value;
    		$$invalidate(0, name);
    	}

    	function options_greeting_binding(value) {
    		greeting = value;
    		$$invalidate(1, greeting);
    	}

    	function options_nameConstant_binding(value) {
    		nameConstant = value;
    		$$invalidate(2, nameConstant);
    	}

    	function options_searchEngine_binding(value) {
    		searchEngine = value;
    		$$invalidate(3, searchEngine);
    	}

    	$$self.$capture_state = () => ({
    		configOrig: data,
    		onMount,
    		Options,
    		config,
    		visible,
    		evalWelcome,
    		evalSearchEngine,
    		loadCSSOptions,
    		toggleVisible,
    		name,
    		greeting,
    		nameConstant,
    		searchEngine
    	});

    	$$self.$inject_state = $$props => {
    		if ("config" in $$props) $$invalidate(4, config = $$props.config);
    		if ("visible" in $$props) $$invalidate(5, visible = $$props.visible);
    		if ("name" in $$props) $$invalidate(0, name = $$props.name);
    		if ("greeting" in $$props) $$invalidate(1, greeting = $$props.greeting);
    		if ("nameConstant" in $$props) $$invalidate(2, nameConstant = $$props.nameConstant);
    		if ("searchEngine" in $$props) $$invalidate(3, searchEngine = $$props.searchEngine);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*name*/ 1) {
    			 $$invalidate(4, config.name = name, config);
    		}

    		if ($$self.$$.dirty & /*greeting*/ 2) {
    			 $$invalidate(4, config.greeting = greeting, config);
    		}

    		if ($$self.$$.dirty & /*nameConstant*/ 4) {
    			 $$invalidate(4, config.nameConstant = nameConstant, config);
    		}

    		if ($$self.$$.dirty & /*searchEngine*/ 8) {
    			 $$invalidate(4, config.searchEngine = searchEngine, config);
    		}
    	};

    	return [
    		name,
    		greeting,
    		nameConstant,
    		searchEngine,
    		config,
    		visible,
    		evalWelcome,
    		toggleVisible,
    		options_name_binding,
    		options_greeting_binding,
    		options_nameConstant_binding,
    		options_searchEngine_binding
    	];
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$1, create_fragment$1, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment$1.name
    		});
    	}
    }

    const app = new App({
    	target: document.body,
    	props: {
    		name: 'world'
    	}
    });

    return app;

}());
//# sourceMappingURL=bundle.js.map
