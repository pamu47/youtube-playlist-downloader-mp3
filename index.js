const fs = require("fs");
const ytdl = require("ytdl-core");
const ytpl = require("ytpl");
const readline = require("readline");
const keypress = require('keypress');

const outputDirectory = "/app/videos";

async function downloadPlaylist() {
  try {
    // Prompt user for playlistUrl
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    const playlistUrl = await new Promise((resolve) => {
      rl.question("Enter the URL of the YouTube playlist: ", (input) => {
        resolve(input);
      });
    });

    rl.close();
    // Get playlist info
    const playlist = await ytpl(playlistUrl);
    const playlistTitle = playlist.title;
    const playlistVideos = playlist.items;
    const audioBitrate = 128; // Desired audio bitrate in Kbps
    const audioFormatExtension = "mp3"; // Desired audio format extension

    // Create the output directory
    if (!fs.existsSync(outputDirectory)) {
      fs.mkdirSync(outputDirectory, { recursive: true });
    }

    const totalVideos = playlistVideos.length;
    let downloadedVideos = 0;

    // Enable listening for keypress events
    keypress(process.stdin);
    process.stdin.setRawMode(true);
    process.stdin.resume();

    // Listen for keypress events
    process.stdin.on("keypress", (_, key) => {
      if (key && (key.name === "q" || key.name === "Q")) {
        console.log("\nDownload interrupted by user");
        cleanup();
      }
    });

    // Start downloading each video in the playlist
    for (const video of playlistVideos) {
      const videoTitle = video.title;
      const videoId = video.id;

      const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
      const audioPath = `${outputDirectory}/${videoTitle}.mp3`;

      const videoInfo = await ytdl.getInfo(videoUrl);
      const audioFormats = ytdl.filterFormats(videoInfo.formats, "audioonly");
      const audioFormat = audioFormats.find(
        (format) => format.audioBitrate === audioBitrate
        // &&
        // format.container === audioFormatExtension
      );

      // Download the audio
      await new Promise((resolve, reject) => {
        const downloadStream = ytdl(videoUrl, { format: audioFormat });
        const writeStream = fs.createWriteStream(audioPath);

        downloadStream.on(
          "progress",
          (chunkLength, downloadedBytes, totalBytes) => {
            const progress = downloadedBytes / totalBytes;
            const downloaded = (downloadedBytes / 1048576)
              .toString()
              .match(/^-?\d+(?:\.\d{0,2})?/)[0];
            // progressBar.update(downloadedVideos + progress);
            console.log(`Downloading ${videoTitle} : ${downloaded}Mb`);
          }
        );

        // Handle download complete
        downloadStream.on("end", () => {
          downloadedVideos++;
          console.log(
            `Downloaded ${videoTitle} (${downloadedVideos}/${totalVideos})`
          );
          resolve();
        });

        // Handle errors
        downloadStream.on("error", (error) => {
          reject(error);
        });

        downloadStream.pipe(writeStream);
      });
    }

    console.log(`Playlist '${playlistTitle}' downloaded successfully!`);
  } catch (error) {
    console.error("Error:", error.message);
  }
}

// Helper function to clean up and exit the program
function cleanup() {
  process.stdin.setRawMode(false);
  process.stdin.pause();
  process.exit();
}

// Start downloading the playlist
downloadPlaylist();
