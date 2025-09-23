namespace MISShareAPI.DTOs
{
    public class NoteDto
    {
        public int Id { get; set; }
        public string Title { get; set; } = string.Empty;
        public string Class { get; set; } = string.Empty;
        public string Topic { get; set; } = string.Empty;
        public int Year { get; set; }
        public string Content { get; set; } = string.Empty;
        public string AuthorName { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; }
    }

    public class CreateNoteDto
    {
        public string Title { get; set; } = string.Empty;
        public string Class { get; set; } = string.Empty;
        public string Topic { get; set; } = string.Empty;
        public int Year { get; set; }
        public string Content { get; set; } = string.Empty;
    }

    public class UpdateNoteDto
    {
        public string? Title { get; set; }
        public string? Class { get; set; }
        public string? Topic { get; set; }
        public int? Year { get; set; }
        public string? Content { get; set; }
    }

    public class SearchNotesDto
    {
        public string? Title { get; set; }
        public string? Topic { get; set; }
        public string? Class { get; set; }
        public int? Year { get; set; }
        public string? Author { get; set; }
        public int Page { get; set; } = 1;
        public int PageSize { get; set; } = 10;
        public string? SortBy { get; set; } = "CreatedAt";
        public string? SortOrder { get; set; } = "desc";
    }
}
