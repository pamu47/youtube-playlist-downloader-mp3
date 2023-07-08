const fs = require('fs');
const ytdl = require('ytdl-core');
const ytpl = require('ytpl');

const playlistUrl = 'https://www.youtube.com/playlist?list=PLdudQuWKVfCg5tt2M6rwrAkdMIeDrGtzc';
const outputDirectory = '/app/videos';

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

    const totalVideos = playlistVideos.length;
    let downloadedVideos = 0;

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

        downloadStream.on('progress', (chunkLength, downloadedBytes, totalBytes) => {
          const progress = downloadedBytes / totalBytes;
          const downloaded = (downloadedBytes/1048576).toString().match(/^-?\d+(?:\.\d{0,2})?/)[0]
          // progressBar.update(downloadedVideos + progress);
          console.log(`Downloading ${videoTitle} : ${downloaded}Mb`);
        });

        // Handle download complete
        downloadStream.on('end', () => {
          downloadedVideos++;
          console.log(`Downloaded ${videoTitle} (${downloadedVideos}/${totalVideos})`);
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

// Start downloading the playlist
downloadPlaylist();
