import { useEffect, useMemo, useRef, useState } from "react";

import type { ImageTask } from "../shared/types";
import { parseTasks, processImages } from "./api";
import "./styles.css";

type UploadImage = {
  file: File;
  previewUrl: string;
  resultUrl?: string;
  status: "ready" | "queued" | "processing" | "done" | "error";
  error?: string;
};

const example =
  "第1张去掉右下角水印。第2、4张删除顶部文字。第3张到第6张去掉左下角标志，保持人物不变。";

function resultSource(image: UploadImage) {
  return image.resultUrl ?? image.previewUrl;
}

export default function App() {
  const [images, setImages] = useState<UploadImage[]>([]);
  const [instruction, setInstruction] = useState("");
  const [tasks, setTasks] = useState<ImageTask[]>([]);
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const imagesRef = useRef<UploadImage[]>([]);

  useEffect(() => {
    imagesRef.current = images;
  }, [images]);

  useEffect(() => {
    return () => {
      imagesRef.current.forEach((image) =>
        URL.revokeObjectURL(image.previewUrl),
      );
    };
  }, []);

  const taskMap = useMemo(
    () => new Map(tasks.map((task) => [task.imageNumber, task.instruction])),
    [tasks],
  );

  function addFiles(fileList: FileList | File[]) {
    const valid = Array.from(fileList).filter((file) =>
      file.type.startsWith("image/"),
    );
    const remaining = Math.max(0, 10 - images.length);
    const accepted = valid.slice(0, remaining);
    if (valid.length > remaining) {
      setNotice("一次最多处理 10 张图片");
    } else {
      setNotice("");
    }
    setTasks([]);
    setImages((current) => [
      ...current,
      ...accepted.map((file) => ({
        file,
        previewUrl: URL.createObjectURL(file),
        status: "ready" as const,
      })),
    ]);
  }

  function removeImage(index: number) {
    setImages((current) => {
      URL.revokeObjectURL(current[index].previewUrl);
      return current.filter((_, imageIndex) => imageIndex !== index);
    });
    setTasks([]);
  }

  async function understandTasks() {
    setNotice("");
    if (!images.length) {
      setNotice("请先上传图片");
      return;
    }
    if (!instruction.trim()) {
      setNotice("请先写下修图要求");
      return;
    }
    setBusy(true);
    try {
      setTasks(await parseTasks(instruction, images.length));
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "无法理解任务");
    } finally {
      setBusy(false);
    }
  }

  async function startProcessing() {
    setBusy(true);
    setNotice("");
    setImages((current) =>
      current.map((image, index) => ({
        ...image,
        status: taskMap.has(index + 1) ? "processing" : "ready",
      })),
    );
    try {
      const results = await processImages(
        images.map((image) => image.file),
        tasks,
      );
      const byNumber = new Map(
        results.map((result) => [
          result.imageNumber,
          result.url ??
            (result.base64
              ? `data:image/png;base64,${result.base64}`
              : undefined),
        ]),
      );
      setImages((current) =>
        current.map((image, index) => {
          const resultUrl = byNumber.get(index + 1);
          if (!taskMap.has(index + 1)) return image;
          return resultUrl
            ? { ...image, resultUrl, status: "done" }
            : { ...image, status: "error", error: "没有返回图片" };
        }),
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : "处理失败";
      setNotice(message);
      setImages((current) =>
        current.map((image, index) =>
          taskMap.has(index + 1)
            ? { ...image, status: "error", error: message }
            : image,
        ),
      );
    } finally {
      setBusy(false);
    }
  }

  function downloadImage(image: UploadImage, index: number) {
    const link = document.createElement("a");
    link.href = resultSource(image);
    link.download = `image-task-${index + 1}.png`;
    link.target = "_blank";
    link.click();
  }

  function downloadAll() {
    images.forEach((image, index) => {
      if (image.status === "done") downloadImage(image, index);
    });
  }

  const completed = images.filter((image) => image.status === "done").length;

  return (
    <main className="app-shell">
      <header className="masthead">
        <div className="brand-mark">10</div>
        <div>
          <p className="eyebrow">PRIVATE IMAGE WORKBENCH</p>
          <h1>按编号，交代修图。</h1>
        </div>
        <div className="privacy-note">
          <span />
          图片仅用于本次处理
        </div>
      </header>

      <section className="hero-grid">
        <div className="intro">
          <p className="section-number">01 / 上传</p>
          <h2>把图片放进工作台，系统会自动编号。</h2>
          <p>最多十张。支持拖拽、批量选择，之后直接用一句话分别交代任务。</p>
        </div>
        <label
          className="drop-zone"
          onDragOver={(event) => event.preventDefault()}
          onDrop={(event) => {
            event.preventDefault();
            addFiles(event.dataTransfer.files);
          }}
        >
          <input
            aria-label="选择图片"
            type="file"
            accept="image/*"
            multiple
            onChange={(event) => {
              if (event.target.files) addFiles(event.target.files);
              event.target.value = "";
            }}
          />
          <span className="drop-plus">+</span>
          <strong>选择或拖入图片</strong>
          <small>{images.length} / 10</small>
        </label>
      </section>

      {notice && <div className="notice">{notice}</div>}

      <section className="image-grid" aria-label="图片工作台">
        {images.map((image, index) => (
          <article className="image-card" key={`${image.file.name}-${index}`}>
            <div className="image-frame">
              <img src={resultSource(image)} alt={`图片 ${index + 1}`} />
              <span className="image-number">{String(index + 1).padStart(2, "0")}</span>
              <button
                className="remove-button"
                onClick={() => removeImage(index)}
                aria-label={`删除图片 ${index + 1}`}
              >
                ×
              </button>
            </div>
            <div className="image-meta">
              <strong>图片 {index + 1}</strong>
              <span data-status={image.status}>
                {image.status === "processing"
                  ? "处理中"
                  : image.status === "done"
                    ? "已完成"
                    : image.status === "error"
                      ? "失败"
                      : taskMap.has(index + 1)
                        ? "已分配"
                        : "待命"}
              </span>
            </div>
            {taskMap.has(index + 1) && (
              <p className="card-task">{taskMap.get(index + 1)}</p>
            )}
            {image.status === "done" && (
              <button
                className="text-button"
                onClick={() => downloadImage(image, index)}
              >
                下载结果
              </button>
            )}
          </article>
        ))}
        {!images.length && (
          <div className="empty-grid">
            <span>01</span><span>02</span><span>03</span><span>…</span><span>10</span>
          </div>
        )}
      </section>

      <section className="command-panel">
        <div className="command-copy">
          <p className="section-number">02 / 交代</p>
          <h2>像安排工作一样写。</h2>
          <p>支持单张、多个编号、连续范围和“除某张外全部”。</p>
          <button className="example-button" onClick={() => setInstruction(example)}>
            使用示例
          </button>
        </div>
        <div className="command-input">
          <label htmlFor="instruction">修图要求</label>
          <textarea
            id="instruction"
            aria-label="修图要求"
            value={instruction}
            onChange={(event) => {
              setInstruction(event.target.value);
              setTasks([]);
            }}
            placeholder="第1张去掉右下角水印。第2张到第5张删除顶部文字，保持人物不变。"
          />
          <button
            className="primary-button"
            onClick={understandTasks}
            disabled={busy}
          >
            {busy && !tasks.length ? "正在理解…" : "理解任务"}
          </button>
        </div>
      </section>

      {tasks.length > 0 && (
        <section className="review-panel">
          <div className="review-heading">
            <div>
              <p className="section-number">03 / 核对</p>
              <h2>系统理解如下</h2>
            </div>
            <span>{tasks.length} 个任务</span>
          </div>
          <div className="task-list">
            {tasks.map((task) => (
              <div className="task-row" key={task.imageNumber}>
                <strong>{String(task.imageNumber).padStart(2, "0")}</strong>
                <p>{task.instruction}</p>
              </div>
            ))}
          </div>
          <div className="action-row">
            <button
              className="primary-button process-button"
              onClick={startProcessing}
              disabled={busy}
            >
              {busy ? "正在处理…" : "确认并开始处理"}
            </button>
            {completed > 0 && (
              <button className="secondary-button" onClick={downloadAll}>
                下载全部结果 ({completed})
              </button>
            )}
          </div>
        </section>
      )}

      <footer>
        <span>IMAGE TASK STUDIO</span>
        <span>最多 10 张 · 私人使用 · 不长期存储</span>
      </footer>
    </main>
  );
}
