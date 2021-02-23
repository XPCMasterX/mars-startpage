<script>
    import { fly } from 'svelte/transition';

    let blurSlider = 25;

    let root = document.documentElement;
    $: root.style.setProperty('--blur-strength', blurSlider + 'px');
    $: console.log(blurSlider);

    let textVisible = false;

    export let name, greeting, nameConstant, searchEngine;
</script>

<div class="option-container" transition:fly={{ x: -350, opacity: 1 }}>
    <div class="option generalProportions">
        <div class="general">
            <p><strong>General</strong></p>
            <div>
                <label for="checkbox">Show text</label>
                <input
                    name="checkbox"
                    type="checkbox"
                    bind:checked={textVisible}
                    on:click={() => {
                        textVisible === true
                            ? root.style.setProperty(
                                  '--option-general-height',
                                  '38vh'
                              )
                            : root.style.setProperty(
                                  '--option-general-height',
                                  '80vh'
                              );
                    }}
                />
            </div>
            <div class="name">
                <p for="name" id="name">Name:</p>
                <input type="text" name="name" id="nameBox" bind:value={name} />
            </div>
            <div>
                {#if textVisible}
                    <p>
                        * is replaced by name, and there can only be one * <br
                        />
                        Also, if greeting is too big for your screen, you can change
                        it in the CSS.
                    </p>
                {/if}
            </div>
            <div class="name">
                <p for="name" id="name">Greeting:</p>
                <input
                    type="text"
                    name="name"
                    id="nameBox"
                    bind:value={greeting}
                />
            </div>
            <div>
                {#if textVisible}
                    <p>
                        If you don't want to use * you can change that too, but
                        you need to <br />
                        use this instead of * in welcome
                    </p>
                {/if}
            </div>
            <div class="name">
                <p for="name" id="name">Name Constant:</p>
                <input
                    type="text"
                    name="name"
                    id="nameConstant"
                    bind:value={nameConstant}
                />
            </div>
            <div>
                {#if textVisible}
                    <p>
                        If you want to use a different search engine, specify it
                        here <br />
                        Options: DuckDuckGo, Google and Bing. <br />
                        You can use a custom url, usually its https://(Search Engine
                        Name (lowercase)).com/search
                    </p>
                {/if}
            </div>
            <div class="name">
                <p for="name" id="name">Search Engine:</p>
                <input
                    type="text"
                    name="name"
                    id="nameConstant"
                    style="width: 7vw !important"
                    bind:value={searchEngine}
                />
            </div>
        </div>
    </div>
    <div class="option blurProportions">
        <div class="blur">
            <p for="blurStrength" id="blurStrengthLabel">Blur Strength:</p>
            <input
                type="range"
                min="1"
                max="100"
                bind:value={blurSlider}
                id="blurStrength"
            />
        </div>
    </div>
</div>

<style>
    /* Import font */
    @import url('https://fonts.googleapis.com/css2?family=Roboto:wght@300&display=swap');

    /* Root Variables */
    :root {
        --option-general-height: 38vh;
    }

    /* Option container */
    .option-container {
        color: white;
        font-family: sans-serif;
        border-radius: 0;

        /* Blur background */
        -webkit-backdrop-filter: blur(10px);
        backdrop-filter: blur(10px);
        background-color: var(--blur-tint);

        /* Make it not affect other elements */
        position: fixed;
        top: 0;
        left: 0;

        height: 100vh;
        width: 20vw;

        /* Give space around child elements */
        padding: 3vh;
        padding-top: 1vh;
        padding-bottom: 1vh;

        /* Keep this here so it darkens and lightens nicely */
        transition: 0.5s;

        /* Global Font Family */
        font-family: Roboto;
    }

    .option-container:hover {
        background-color: var(--hover-tint);
    }

    /* Default settings for each option */
    .option {
        /* Nice looking Shadow */
        box-shadow: 0 2.8px 2.2px rgba(0, 0, 0, 0.034),
            0 6.7px 5.3px rgba(0, 0, 0, 0.048),
            0 12.5px 10px rgba(0, 0, 0, 0.06),
            0 22.3px 17.9px rgba(0, 0, 0, 0.072),
            0 41.8px 33.4px rgba(0, 0, 0, 0.086),
            0 100px 80px rgba(0, 0, 0, 0.12);

        background-color: rgba(0, 0, 0, 0.1);
        width: 30;
        height: 30vh;
        border-radius: 10px;

        /* So the options don't stick together */
        margin-bottom: 1vh;

        font-size: 15px;
    }

    /* Default Settings for text */
    .general {
        display: inline-block;
        margin-left: 26px;
        margin-top: -5px;
    }

    /* Container containing blur slider */
    .blur {
        position: relative;
        margin-left: 20px;
    }

    /* Blur Strength Slider */
    #blurStrength {
        -webkit-appearance: none;
        outline: none;
        height: 1px;
        transform: translateY(5px);
        position: fixed;
        margin-top: 2.7vh;
        margin-left: 10px;
    }

    #blurStrength::-webkit-slider-thumb {
        -webkit-appearance: none;
        appearance: none;
        width: 20px;
        border-radius: 50%;
        height: 20px;
        background: #ffffff;
    }

    /* Text fields */
    #nameBox {
        display: inline-block;
        background-color: transparent;
        border: 2px solid white;
        outline: none;
        color: white;
        height: 20px;
        text-indent: 2px;
        margin-left: 5px;
    }

    #nameConstant {
        display: inline-block;
        background-color: transparent;
        border: 2px solid white;
        outline: none;
        color: white;
        height: 20px;
        text-indent: 2px;
        margin-left: 5px;
        width: 3vw;
    }

    /* Label */
    #name {
        display: inline-block;
    }

    /* Proportions (change sizes here) */
    .blurProportions {
        height: 7vh;
        width: 20vw;
    }

    .generalProportions {
        height: var(--option-general-height);
        width: 20vw;
    }

    #blurStrengthLabel {
        display: inline-block;
        font-size: 15px;
        margin-left: 7px;
    }
</style>
