"use client";

import Image, { type ImageProps } from "next/image";
import { useState } from "react";

type Props = ImageProps & { mobileSrcSet?: string };

/** Keep the original file available if a responsive image request fails. */
export function ResilientImage({ onError, unoptimized, alt, mobileSrcSet, ...props }: Props) {
  const [failedSource, setFailedSource] = useState<ImageProps["src"] | null>(null);
  const failed = failedSource === props.src;
  const image = <Image {...props} alt={alt} unoptimized={unoptimized || failed} onError={event => {
    setFailedSource(props.src);
    onError?.(event);
  }} />;
  return mobileSrcSet ? <picture className={props.className}>
    {!failed ? <source media="(max-width: 767px)" srcSet={mobileSrcSet} sizes="calc(100vw - 32px)" type="image/webp" /> : null}
    {image}
  </picture> : image;
}
