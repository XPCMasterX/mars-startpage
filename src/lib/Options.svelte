<script>
    import { fly } from 'svelte/transition';
</script>

<style>
    .option-container {
        color: white;
        font-family: sans-serif;
        line-height: 1.5;
        border-radius: 0;
        height: 100vh;
        width: 35vh;

        /* Blur background */
        -webkit-backdrop-filter: blur(10px);
        backdrop-filter: blur(10px);
        background-color: rgba(0, 0, 0, 0.3);

        /* Make it not affect other elements */
        position: fixed;
        top: 0;
        left: 0;

        /* Give space around child elements */
        padding: 3vh;
        padding-top: 1vh;
        padding-bottom: 1vh;

        /* Keep this here so it darkens and lightens nicely */
		transition: 0.5s;
    }

    .option {
        /* Nice looking Shadow */
        box-shadow:
          0 2.8px 2.2px rgba(0, 0, 0, 0.034),
          0 6.7px 5.3px rgba(0, 0, 0, 0.048),
          0 12.5px 10px rgba(0, 0, 0, 0.06),
          0 22.3px 17.9px rgba(0, 0, 0, 0.072),
          0 41.8px 33.4px rgba(0, 0, 0, 0.086),
          0 100px 80px rgba(0, 0, 0, 0.12)
        ;

        background-color: rgba(0, 0, 0, 0.1);
        width: 30;
        height: 30vh;
        border-radius: 10px;
    }

    .option-container:hover {
		background-color: rgba(0, 0, 0, 0.1);
	}
</style>

<div class="option-container" transition:fly="{{ x: -310, opacity: 1}}">
    <div class="option">
        <p>Dark Mode</p>
    </div>
    <div class="option">
        <p>Dark Mode</p>
    </div>
    <div class="option">
        <p>Dark Mode</p>
    </div>
</div>
