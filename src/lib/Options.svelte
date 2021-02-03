<script>
    import { fly } from 'svelte/transition';

    let blurSlider = 25;

    let root = document.documentElement;
    $: root.style.setProperty('--blur-strength', blurSlider + 'px');
    $: console.log(blurSlider);
</script>

<div class="option-container" transition:fly={{ x: -310, opacity: 1 }}>
    <div class="option">
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
    .option-container {
        color: white;
        font-family: sans-serif;
        border-radius: 0;

        /* Blur background */
        -webkit-backdrop-filter: blur(10px);
        backdrop-filter: blur(10px);
        background-color: rgba(0, 0, 0, 0.3);

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
    }

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

        height: 7vh;
        width: 20vw;
    }

    .option-container:hover {
        background-color: rgba(0, 0, 0, 0.1);
    }

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

    #blurStrengthLabel {
        display: inline-block;
        font-size: 15px;
        margin-left: 7px;
    }

    .blur {
        position: relative;
        margin-left: 20px;
    }
</style>
