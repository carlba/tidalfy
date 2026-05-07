-- DropForeignKey
ALTER TABLE "discogs_match" DROP CONSTRAINT "discogs_match_track_id_fkey";

-- AddForeignKey
ALTER TABLE "discogs_match" ADD CONSTRAINT "discogs_match_track_id_fkey" FOREIGN KEY ("track_id") REFERENCES "track"("id") ON DELETE CASCADE ON UPDATE CASCADE;
