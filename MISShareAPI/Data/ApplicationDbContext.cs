using Microsoft.EntityFrameworkCore;
using MISShareAPI.Models;

namespace MISShareAPI.Data
{
    public class ApplicationDbContext : DbContext
    {
        public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options) : base(options)
        {
        }

        public DbSet<User> Users { get; set; }
        public DbSet<Note> Notes { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            // User entity configuration
            modelBuilder.Entity<User>(entity =>
            {
                entity.HasIndex(e => e.Email).IsUnique();
                entity.HasIndex(e => e.CWID).IsUnique();
                entity.Property(e => e.CWID).HasMaxLength(8);
            });

            // Note entity configuration
            modelBuilder.Entity<Note>(entity =>
            {
                entity.HasOne(d => d.Author)
                    .WithMany(p => p.Notes)
                    .HasForeignKey(d => d.AuthorId)
                    .OnDelete(DeleteBehavior.Restrict);
            });

        }
    }
}
