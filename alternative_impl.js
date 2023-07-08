const fs = require('fs');
const ytdl = require('ytdl-core');
const ProgressBar = require('progress');
const ytpl = require('ytpl');

const playlistUrl = 'https://www.youtube.com/playlist?list=PLdudQuWKVfCg5tt2M6rwrAkdMIeDrGtzc';
const outputDirectory = '/app/videos';

// Set up progress bar
let progressBar;
let totalVideos = 0;
let downloadedVideos = 0;

async function downloadPlaylist() {
  try {
    // Get playlist info
    const playlist = await ytpl(playlistUrl);
    const playlistTitle = playlist.title;
    const playlistVideos = playlist.items;

    // Create the output directory
    if (!fs.existsSync(outputDirectory)) {
      fs.mkdirSync(outputDirectory, { recursive: true });
    }

    totalVideos = playlistVideos.length;

    // Start downloading each video in the playlist
    for (const video of playlistVideos) {
      const videoTitle = video.title;
      const videoId = video.id;

      const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
      const audioPath = `${outputDirectory}/${videoTitle}.mp3`;

      const videoInfo = await ytdl.getInfo(videoUrl);
      const audioFormat = ytdl.filterFormats(videoInfo.formats, 'audioonly')[0];

      // Download the audio
      await new Promise((resolve, reject) => {
        const downloadStream = ytdl(videoUrl, { format: audioFormat });
        const writeStream = fs.createWriteStream(audioPath);

        // Update progress bar
        downloadStream.on('progress', (chunkLength, downloadedBytes, totalBytes) => {
          const progress = downloadedBytes / totalBytes;
          progressBar.update(downloadedVideos + progress);
        });

        // Handle download complete
        downloadStream.on('end', () => {
          downloadedVideos++;
          progressBar.update(downloadedVideos);
          progressBar.terminate();
          console.log(`Downloaded ${videoTitle}`);
          resolve();
        });

        // Handle errors
        downloadStream.on('error', (error) => {
          reject(error);
        });

        downloadStream.pipe(writeStream);
      });
    }

    console.log(`Playlist '${playlistTitle}' downloaded successfully!`);
  } catch (error) {
    console.error('Error:', error.message);
  }
}

// Set up progress bar
progressBar = new ProgressBar('[:bar] :percent :etas', {
  complete: '=',
  incomplete: ' ',
  width: 20,
  total: totalVideos,
});

// Start downloading the playlist
downloadPlaylist();
