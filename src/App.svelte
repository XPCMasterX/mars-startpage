<script>
    import configOrig from '../config.yaml';
    import { onMount } from 'svelte';
    import Options from './lib/Options.svelte';

    let config = JSON.parse(JSON.stringify(configOrig));

    let visible = false;

    function evalWelcome(string, nameConstant) {
        return string.replace(nameConstant, config.name);
    }

    function evalSearchEngine(searchEngine) {
        switch (searchEngine) {
            case 'DuckDuckGo':
                return 'https://duckduckgo.com/search';
                break;
            case 'Google':
                return 'https://google.com/search';
                break;
            case 'Bing':
                return 'https://bing.com/search';
                break;
            default:
                return searchEngine;
        }
    }

    function loadCSSOptions() {
        let root = document.documentElement;
        let cssProperties = Object.entries(config.css);

        for (const [key, value] of cssProperties) {
            root.style.setProperty('--' + key, value.toString());
        }
    }

    function toggleVisible() {
        visible = visible === true ? false : true;
    }

    onMount(async () => {
        loadCSSOptions();
        document.body.style['background-image'] = 'url(./background.jpg)';
    });

    /* Assign config.name to name first so it doesn't say undefined and any 
		further changes will be updated live.
		Also autofills the textbox
	*/
    let name = config.name,
        greeting = config.greeting,
        nameConstant = config.nameConstant,
        searchEngine = config.searchEngine;
    $: config.name = name;
    $: config.greeting = greeting;
    $: config.nameConstant = nameConstant;
    $: config.searchEngine = searchEngine;
</script>

<div>
    <p>{evalWelcome(config.greeting, config.nameConstant)}</p>
    <form action={evalSearchEngine(config.searchEngine)} method="get">
        <input type="hidden" name="sitesearch" />
        <div id="search-area">
            <div class="search-bar-wrap">
                <input type="text" name="q" id="search" />
            </div>
        </div>
    </form>
</div>
{#if visible}
    <Options bind:name bind:greeting bind:nameConstant bind:searchEngine />
{/if}

<!--Icons made by Freepik from www.flaticon.com-->
<div class="settings">
    <img src="./settings.svg" alt="Settings" on:click={toggleVisible} />
</div>

<div class="blur" />

<style>
    @import url('https://fonts.googleapis.com/css2?family=Roboto:wght@100&display=swap');

    p {
        font-family: Roboto;
        font-size: var(--text-font-size);

        /* Get the Gradient */
        background-image: linear-gradient(
            45deg,
            var(--gradient-start),
            var(--gradient-end)
        );
        background-size: 100%;
        background-repeat: repeat;
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        -moz-background-clip: text;
        -moz-text-fill-color: transparent;
        background-clip: text;

        /* Force words to be on the same line */
        overflow: hidden;
        white-space: nowrap;

        /* Antialiasing?*/
        -webkit-font-smoothing: antialiased;
        -moz-osx-font-smoothing: grayscale;

        /* Centering */
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        margin-top: 15%;
    }

    form {
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        margin-top: 25%;
    }

    div {
        position: relative;
    }

    #search {
        border: none;
        outline: none;
        width: 40rem;
        background-color: var(--search-background-color);
        height: 35px;
        border-radius: 20px;
        text-indent: 10px;
        color: white;
        font-family: Roboto;
        font-weight: bold;
    }
    .search-bar-wrap {
        -webkit-border-radius: 50px;
        -moz-border-radius: 50px;
        border-radius: 50px;
        border: none;
        padding: 1rem;
        position: relative;
        background: linear-gradient(
            45deg,
            var(--gradient-start),
            var(--gradient-end)
        );
        padding: 3px;
        display: inline-block;
    }

    img {
        height: 32px;
        width: 32px;

        /* Vertically align it to the center */
        padding-top: 8px;
    }

    .settings {
        /* Make it bigger than the icon */
        height: 48px;
        width: 48px;

        /* Align the icon to the center */
        text-align: center;

        /* Position it at bottom left */
        position: fixed;
        bottom: 8px;
        right: 8px;

        /* Blur the background */
        -webkit-backdrop-filter: blur(10px);
        backdrop-filter: blur(10px);
        background-color: var(--blur-tint);

        /* Rounded corners */
        border-radius: 10px;

        /* Keep this here so it darkens and lightens nicely */
        transition: 0.5s;
    }

    .settings:hover {
        background-color: var(--hover-tint);
    }

    .blur {
        position: fixed;
        top: 0;
        right: 0;
        height: 100vh;
        width: 100vw;
        background-color: var(--image-blur);
        z-index: -1;
        -webkit-backdrop-filter: blur(var(--blur-strength));
        backdrop-filter: blur(var(--blur-strength));
    }
</style>
