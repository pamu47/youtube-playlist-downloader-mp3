const fs = require("fs");
const ytdl = require("ytdl-core");
const ytpl = require("ytpl");
const { SingleBar } = require("cli-progress");
const readline = require("readline");

const playlistUrl =
  "https://www.youtube.com/playlist?list=PLdudQuWKVfCj8fsvKTmW95A0eD75qH32x";
const outputDirectory = "/app/videos";

async function downloadPlaylist() {
  try {
    // Get playlist info
    const playlist = await ytpl(playlistUrl);
    const playlistTitle = playlist.title;
    const playlistVideos = playlist.items;
    let audioBitrate = 128; // Desired audio bitrate in Kbps
    const audioFormatExtension = "mp3"; // Desired audio format extension

    // Create the output directory
    if (!fs.existsSync(outputDirectory)) {
      fs.mkdirSync(outputDirectory, { recursive: true });
    }

    const totalVideos = playlistVideos.length;
    let downloadedVideos = 0;

    // Prompt user for audioBitrate
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    const answer = await new Promise((resolve) => {
      rl.question('Enter the desired audio bitrate (in Kbps): ', (input) => {
        resolve(input);
      });
    });

    rl.close();

    // Check if user provided audioBitrate, otherwise use the default value
    if (answer && !isNaN(answer)) {
      audioBitrate = parseInt(answer);
    }

    // Initialize the progress bar
    const progressBar = new SingleBar({
      format: "[:bar] :percent :etas",
      barCompleteChar: "\u2588",
      barIncompleteChar: "\u2591",
      hideCursor: true,
      stopOnComplete: true,
      clearOnComplete: false,
      stream: process.stdout,
      barsize: 20,
      etaBuffer: 100,
    });

    // Start downloading each video in the playlist
    progressBar.start(totalVideos, 0);

    for (const video of playlistVideos) {
      const videoTitle = video.title;
      const videoId = video.id;

      const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
      const audioPath = `${outputDirectory}/${videoTitle}.mp3`;

      const videoInfo = await ytdl.getInfo(videoUrl);
      const audioFormats = ytdl.filterFormats(videoInfo.formats, "audioonly");
      const audioFormat = audioFormats.find(
        (format) =>
          format.audioBitrate === audioBitrate &&
          format.container === audioFormatExtension
      );

      // Download the audio
      await new Promise((resolve, reject) => {
        const downloadStream = ytdl(videoUrl, { format: audioFormat });
        const writeStream = fs.createWriteStream(audioPath);

        let downloadedBytes = 0;
        let totalBytes = 0;

        // Update the progress bar
        downloadStream.on("progress", (_, downloaded, total) => {
          downloadedBytes = downloaded;
          totalBytes = total;
          const progress = downloaded / total;
          progressBar.update(downloadedVideos + progress);
        });

        // Handle download complete
        downloadStream.on("end", () => {
          downloadedVideos++;
          progressBar.update(downloadedVideos);
          console.log(`Downloaded ${videoTitle}`);
          resolve();
        });

        // Handle errors
        downloadStream.on("error", (error) => {
          reject(error);
        });

        downloadStream.pipe(writeStream);

        // Handle write stream close
        writeStream.on("close", () => {
          progressBar.update(downloadedVideos + downloadedBytes / totalBytes);
        });

        // Handle write stream error
        writeStream.on("error", (error) => {
          reject(error);
        });
      });
    }

    progressBar.stop();
    console.log(`Playlist '${playlistTitle}' downloaded successfully!`);
  } catch (error) {
    console.error("Error:", error.message);
  }
}

// Start downloading the playlist
downloadPlaylist();
