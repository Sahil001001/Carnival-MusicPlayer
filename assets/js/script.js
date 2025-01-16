let currentSong = new Audio();
let isPlaying = false; // Track playing state
let allSongs = []; // Store all songs
let currentArtist = null; // Track currently selected artist

function secondsToMinutesSeconds(seconds) {
    if (isNaN(seconds) || seconds < 0) {
        return "00:00";
    }
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    const formattedMinutes = String(minutes).padStart(2, '0');
    const formattedSeconds = String(remainingSeconds).padStart(2, '0');
    return `${formattedMinutes}:${formattedSeconds}`;
}

async function getSongs() {
    try {
        let a = await fetch('http://127.0.0.1:5500/songs/');
        let response = await a.text();
        let div = document.createElement('div');
        div.innerHTML = response;
        let as = div.getElementsByTagName("a");
        let songs = [];
        for (let index = 1; index < as.length; index++) {
            const element = as[index];
            if (element.href.endsWith('.mp3')) {
                songs.push(element.href.split("/songs/")[1]);
            }
        }
        return songs;
    } catch (error) {
        console.error("Error fetching songs:", error);
        return [];
    }
}

// Function to parse artist name from song filename
function parseArtistFromSong(songName) {
    songName = songName.replace('.mp3', '').replaceAll('%20', ' ');
    const separators = [' - ', ' – ', ' _ ', ' by '];
    for (let separator of separators) {
        if (songName.includes(separator)) {
            return songName.split(separator)[0];
        }
    }
    return '';
}

// Function to filter songs by artist
function filterSongsByArtist(songs, artistName) {
    return songs.filter(song => {
        const songArtist = parseArtistFromSong(song);
        return songArtist.toLowerCase() === artistName.toLowerCase();
    });
}

// Function to update song list display
function updateSongList(songs) {
    const songUL = document.querySelector(".songList").getElementsByTagName("ul")[0];
    let listHTML = "";
    for (const song of songs) {
        listHTML += `<li>
            <img class="invert" src="music.svg" alt="pic">
            <div class="info">
                <div>${song.replaceAll("%20", " ")}</div>
            </div>
            <div class="playnow">
                <span>Play now</span>
                <img class="invert" src="play.svg" alt="play">
            </div>
        </li>`;
    }
    songUL.innerHTML = listHTML;
    
    // Reattach click listeners to new list items
    Array.from(songUL.getElementsByTagName("li")).forEach(e => {
        e.addEventListener("click", () => {
            playMusic(e.querySelector(".info").firstElementChild.innerHTML.trim());
        });
    });
}

async function initializeSongDatabase() {
    const songs = await getSongs();
    return songs.map((songFileName, id) => {
        const name = songFileName.replace('.mp3', '').replaceAll('%20', ' ');
        let artist = "";
        let songName = name;
        if (name.includes(' - ')) {
            [artist, songName] = name.split(' - ');
        }
        return {
            id: id + 1,
            fileName: songFileName,
            name: songName,
            artist: artist,
            img: "music.svg"
        };
    });
}

function updatePlayPauseUI(playing) {
    const play = document.querySelector("#play");
    const songButtons = document.querySelector(".songButtons");
    const seekBar = document.querySelector(".seekBar");
    const circle = document.querySelector(".circle");
    
    play.src = playing ? "pause.svg" : "play.svg";
    
    if (playing) {
        songButtons.classList.add("active");
        seekBar.classList.add("active");
        circle.classList.add("active");
    } else if (!currentSong.src) {
        songButtons.classList.remove("active");
        seekBar.classList.remove("active");
        circle.classList.remove("active");
    }
}

const playMusic = (track) => {
    try {
        const wasPlaying = !currentSong.paused;
        const currentTime = currentSong.currentTime;
        const isSameTrack = currentSong.src.endsWith(track);
        
        currentSong.src = "/songs/" + track;
        
        if (isSameTrack) {
            currentSong.currentTime = currentTime;
        }
        
        const playPromise = currentSong.play();
        if (playPromise !== undefined) {
            playPromise.then(() => {
                isPlaying = true;
                updatePlayPauseUI(true);
            }).catch(error => {
                console.error("Playback failed:", error);
                isPlaying = false;
                updatePlayPauseUI(false);
            });
        }
        
        const readableName = track.replaceAll("%20", " ");
        document.querySelector(".songInfo").innerHTML = readableName;
        document.querySelector(".songTime").innerHTML = `<h4>${secondsToMinutesSeconds(0)} / ${secondsToMinutesSeconds(currentSong.duration)}</h4>`;
        
        const songButtons = document.querySelector(".songButtons");
        songButtons.style.display = "flex";
        songButtons.style.justifyContent = "space-evenly";
        songButtons.style.alignItems = "center";
        document.querySelector(".seekBar").style.display = "block";
        document.querySelector(".circle").style.display = "block";
    } catch (error) {
        console.error("Error playing music:", error);
    }
};

function togglePlayPause() {
    if (!currentSong.src) {
        console.log("No song selected");
        return;
    }
    
    try {
        if (currentSong.paused) {
            const playPromise = currentSong.play();
            if (playPromise !== undefined) {
                playPromise.then(() => {
                    isPlaying = true;
                    updatePlayPauseUI(true);
                }).catch(error => {
                    console.error("Play failed:", error);
                    isPlaying = false;
                    updatePlayPauseUI(false);
                });
            }
        } else {
            currentSong.pause();
            isPlaying = false;
            updatePlayPauseUI(false);
        }
    } catch (error) {
        console.error("Error toggling play/pause:", error);
    }
}

async function main() {
    allSongs = await getSongs(); // Store all songs globally
    let songUL = document.querySelector(".songList").getElementsByTagName("ul")[0];
    updateSongList(allSongs); // Initial display of all songs
    
    // Add click handlers to artist cards
    const artistCards = document.querySelectorAll('.artist-card');
    artistCards.forEach(card => {
        card.addEventListener('click', () => {
            const artistName = card.querySelector('h4').textContent;
            
            if (currentArtist === artistName) {
                // If clicking the same artist again, show all songs
                currentArtist = null;
                updateSongList(allSongs);
                card.classList.remove('active');
            } else {
                // Remove active class from all cards
                artistCards.forEach(c => c.classList.remove('active'));
                
                // Add active class to clicked card
                card.classList.add('active');
                
                // Filter and display artist's songs
                currentArtist = artistName;
                const artistSongs = filterSongsByArtist(allSongs, artistName);
                updateSongList(artistSongs);
            }
        });
    });
    
    // Add hover effect styles for artist cards
    const style = document.createElement('style');
    style.textContent = `
        .artist-card {
            cursor: pointer;
            transition: transform 0.2s ease;
        }
        .artist-card:hover {
            transform: scale(1.05);
        }
        .artist-card.active {
            box-shadow: 0 0 0 2px #1DB954;
        }
    `;
    document.head.appendChild(style);
    
    // Initialize search functionality
    const searchInput = document.querySelector('.textarea');
    const librarySection = document.querySelector('.library');
    const searchResultsSection = document.querySelector('.search-results');
    const resultsListContainer = document.querySelector('.results-list');
    
    function displayInitialSongList() {
        let listHTML = "";
        for (const song of allSongs) {
            listHTML += `<li>
                            <img class="invert" src="music.svg" alt="pic">
                            <div class="info">
                                <div>${song.replaceAll("%20", " ")}</div>
                            </div>
                            <div class="playnow">
                                <span>Play now</span>
                                <img class="invert" src="play.svg" alt="play">
                            </div>
                        </li>`;
        }
        songUL.innerHTML = listHTML;
    }

    displayInitialSongList();

    async function handleSearch(event) {
        const query = event.target.value.toLowerCase();
        const songDatabase = await initializeSongDatabase();
        
        if (query.length === 0) {
            hideSearchResults();
            return;
        }

        const results = songDatabase.filter(song => 
            song.name.toLowerCase().includes(query) ||
            song.artist.toLowerCase().includes(query)
        );

        displaySearchResults(results);
    }

    function displaySearchResults(results) {
        resultsListContainer.innerHTML = '';
        
        const resultsHTML = results.map(song => `
            <div class="result-item" data-song-filename="${song.fileName}">
                <img src="${song.img}" alt="song" class="invert">
                <div class="result-info">
                    <div class="song-name">${song.name}</div>
                    ${song.artist ? `<div class="artist-name">${song.artist}</div>` : ''}
                </div>
                <div class="playnow">
                    <span>Play now</span>
                    <img class="invert" src="play.svg" alt="play">
                </div>
            </div>
        `).join('');

        resultsListContainer.innerHTML = resultsHTML;
        librarySection.style.display = 'none';
        searchResultsSection.style.display = 'block';

        if (window.innerWidth <= 768) {
            leftDiv.classList.add('show-search');
            overlay.classList.add('show');
        }
    }

    function hideSearchResults() {
        searchResultsSection.style.display = 'none';
        librarySection.style.display = 'block';
        leftDiv.classList.remove('show-search');
        overlay.classList.remove('show');
    }

    // Event listeners for songs
    Array.from(document.querySelector(".songList").getElementsByTagName("li")).forEach(e => {
        e.addEventListener("click", () => {
            playMusic(e.querySelector(".info").firstElementChild.innerHTML.trim());
        });
    });

    // Previous button
    document.querySelector("#previous").addEventListener("click", () => {
        if (!currentSong.src) return;
        
        currentSong.pause();
        let lastIndex = allSongs.length - 1;
        let index = allSongs.indexOf(currentSong.src.split("/").slice(-1)[0]);
        if ((index - 1) >= 0) {
            playMusic(allSongs[index - 1]);
        } else {
            playMusic(allSongs[lastIndex]);
        }
    });

    // Play/Pause button
    document.querySelector("#play").addEventListener("click", togglePlayPause);

    // Next button
    document.querySelector("#next").addEventListener("click", () => {
        if (!currentSong.src) return;
        
        currentSong.pause();
        let index = allSongs.indexOf(currentSong.src.split("/").slice(-1)[0]);
        if ((index + 1) < allSongs.length) {
            playMusic(allSongs[index + 1]);
        } else {
            playMusic(allSongs[0]);
        }
    });

    // Time update
    currentSong.addEventListener("timeupdate", () => {
        document.querySelector(".songTime").innerHTML = `<h4>${secondsToMinutesSeconds(currentSong.currentTime)} / ${secondsToMinutesSeconds(currentSong.duration)}</h4>`;
        document.querySelector(".circle").style.left = (currentSong.currentTime / currentSong.duration) * 100 + "%";
    });

    // Seekbar
    document.querySelector(".seekBar").addEventListener("click", (e) => {
        if (!currentSong.src) return;
        
        let percent = (e.offsetX / e.target.getBoundingClientRect().width) * 100;
        document.querySelector(".circle").style.left = percent + "%";
        currentSong.currentTime = ((currentSong.duration) * percent) / 100;
    });

    // Event listeners
    currentSong.addEventListener("ended", () => {
        isPlaying = false;
        updatePlayPauseUI(false);
        
        // Automatically play next song
        const currentIndex = allSongs.indexOf(currentSong.src.split("/").slice(-1)[0]);
        if ((currentIndex + 1) < allSongs.length) {
            playMusic(allSongs[currentIndex + 1]);
        } else {
            playMusic(allSongs[0]);
        }
    });

    currentSong.addEventListener("error", (e) => {
        console.error("Audio error:", e);
        isPlaying = false;
        updatePlayPauseUI(false);
    });

    // Search event listeners
    searchInput.addEventListener('input', handleSearch);
    
    resultsListContainer.addEventListener('click', (event) => {
        const resultItem = event.target.closest('.result-item');
        if (resultItem) {
            const songFileName = resultItem.dataset.songFilename;
            playMusic(songFileName);
            
            if (window.innerWidth <= 768) {
                hideSearchResults();
            }
        }
    
    });

    // Mobile sidebar functionality
    const overlay = document.createElement('div');
    overlay.classList.add('overlay');
    document.body.appendChild(overlay);

    const homeButton = document.querySelector('.home-btn');
    const leftDiv = document.querySelector('.left');

    function toggleSidebar() {
        leftDiv.classList.toggle('show');
        overlay.classList.toggle('show');
        document.body.style.overflow = leftDiv.classList.contains('show') ? 'hidden' : '';
    }

    homeButton.addEventListener('click', toggleSidebar);
    overlay.addEventListener('click', toggleSidebar);

    // Handle window resize
    window.addEventListener('resize', () => {
        if (window.innerWidth > 768) {
            if (leftDiv.classList.contains('show')) {
                leftDiv.classList.remove('show');
                overlay.classList.remove('show');
                document.body.style.overflow = '';
            }
        }
    });

    // Close sidebar with Escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            if (leftDiv.classList.contains('show')) {
                toggleSidebar();
            }
            hideSearchResults();
        }
    });

    
}

main();