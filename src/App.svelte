<script>
	import config from '../config.yaml';
	import { onMount } from 'svelte';

	function evalWelcome(string, nameConstant) {
		return string.replace(nameConstant, config.name);
	}

	function evalSearchEngine(searchEngine) {
		switch(searchEngine) {
			case 'DuckDuckGo':
				return 'https://duckduckgo.com/search';
				break;
			case 'Google':
				return 'https://google.com/search'
				break;
			case 'Bing':
				return 'https://bing.com/search'
				break;
			default:
				return searchEngine;
		}
	}

	function loadCSSOptions() {
		let root = document.documentElement;
		let cssProperties = Object.entries(config.css);

		for (const [key, value] of cssProperties) {
			root.style.setProperty('--' + key, value.toString())
		}
	}

	onMount(async () => {
		loadCSSOptions();
		document.body.style['background-color'] = getComputedStyle(document.documentElement).getPropertyValue('--background-color');	
	})

</script>

<style>
	@import url('https://fonts.googleapis.com/css2?family=Roboto:wght@100&display=swap');

	p {
		font-family: Roboto;
		font-size: var(--text-font-size);

		/* Get the Gradient */
		background-image: linear-gradient(45deg, var(--gradient-start), var(--gradient-end));
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
		background-color: var(--background-color);
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
	  background: linear-gradient(45deg, var(--gradient-start), var(--gradient-end));
	  padding: 3px;
	  display: inline-block;
	}
</style>


<div>
	<p>{evalWelcome(config.greeting, config.nameConstant)}</p>
	<form action={evalSearchEngine(config.searchEngine)} method="get">
		<input type="hidden" name="sitesearch" />
		<div id="search-area">
			<div class="search-bar-wrap">
					<input type="text" name="q" id="search"/>
			</div>
	</form>
</div>
